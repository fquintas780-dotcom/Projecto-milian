// Supabase Edge Function: verifica um comprovativo de pagamento Multicaixa
// Express usando a API do Google Gemini (visão) e decide se o pagamento é
// aprovado automaticamente ou fica pendente de revisão manual.
//
// Secrets necessários (supabase secrets set ...):
//   GEMINI_API_KEY
//   GEMINI_VERIFY_MODEL (opcional, default abaixo)
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY são
// injetados automaticamente pelo runtime das Edge Functions.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const DEFAULT_MODEL = 'gemini-2.5-flash'
const MCX_NUMBER = Deno.env.get('MCX_NUMBER') ?? '943231005'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AiVerificationResult {
  valores_extraidos: {
    valor: number | null
    data: string | null
    numero_destino: string | null
    referencia: string | null
  }
  valores_batem: boolean
  sinais_suspeitos: string[]
  confianca: 'alta' | 'média' | 'baixa'
  recomendacao: 'aprovar_automaticamente' | 'revisao_manual'
}

function buildPrompt(expectedAmount: number, expectedNumber: string): string {
  return `Estás a analisar um comprovativo de transferência da app MCX Express (Multicaixa Express) em Angola.

Valor esperado: ${expectedAmount} Kz
Número de destino esperado: ${expectedNumber}

Faz o seguinte:
1. Extrai do comprovativo: valor transferido, data/hora, número de destino, referência/ID da transação (se visível).
2. Compara o valor e o número de destino extraídos com os valores esperados acima.
3. Analisa o próprio ficheiro em busca de sinais de edição ou falsificação: inconsistências de fonte,
   alinhamento ou cor no texto; elementos de interface fora do padrão conhecido da app MCX Express;
   bordas cortadas de forma estranha; sombras de texto anómalas; formato de data/número de conta inconsistente.

Responde APENAS com um objeto JSON válido, sem texto adicional, exatamente neste formato:
{
  "valores_extraidos": { "valor": number|null, "data": string|null, "numero_destino": string|null, "referencia": string|null },
  "valores_batem": boolean,
  "sinais_suspeitos": string[],
  "confianca": "alta" | "média" | "baixa",
  "recomendacao": "aprovar_automaticamente" | "revisao_manual"
}`
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

async function callGemini(base64: string, mediaType: string, prompt: string): Promise<AiVerificationResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada.')
  const model = Deno.env.get('GEMINI_VERIFY_MODEL') ?? DEFAULT_MODEL

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }, { inline_data: { mime_type: mediaType, data: base64 } }],
          },
        ],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    },
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Erro da API do Gemini (${response.status}): ${text}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Resposta da IA não contém JSON válido.')
  return JSON.parse(jsonMatch[0]) as AiVerificationResult
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { paymentId } = await req.json()
    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'paymentId em falta.' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Cliente com o token do utilizador chamador: confirma, via RLS, que
    // este utilizador tem mesmo acesso a este pagamento antes de agir.
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: payment, error: paymentError } = await callerClient
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle()

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: 'Pagamento não encontrado ou sem acesso.' }), {
        status: 404,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: fileBlob, error: downloadError } = await adminClient.storage
      .from('payment-proofs')
      .download(payment.proof_path)
    if (downloadError || !fileBlob) {
      throw new Error('Não foi possível carregar o comprovativo.')
    }

    const mediaType = fileBlob.type || (payment.proof_path.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
    const base64 = arrayBufferToBase64(await fileBlob.arrayBuffer())

    const prompt = buildPrompt(payment.amount, MCX_NUMBER)
    const aiResult = await callGemini(base64, mediaType, prompt)

    const autoApprove =
      aiResult.valores_batem && aiResult.sinais_suspeitos.length === 0 && aiResult.confianca === 'alta'
    const status = autoApprove ? 'auto_approved' : 'pending_review'

    await adminClient
      .from('payments')
      .update({ ai_result: aiResult, status })
      .eq('id', paymentId)

    if (autoApprove) {
      const periodEnd = new Date()
      periodEnd.setMonth(periodEnd.getMonth() + 1)
      await adminClient
        .from('subscriptions')
        .update({ status: 'active', current_period_end: periodEnd.toISOString() })
        .eq('id', payment.subscription_id)
    }

    return new Response(JSON.stringify({ status, ai_result: aiResult }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro desconhecido.' }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
