# -*- coding: utf-8 -*-
"""
database.py
============
Camada de persistência (SQLite) do bot.

Responsável por:
- Criar as tabelas necessárias (banca, bilhetes, jogos_bilhete) no primeiro uso.
- Ler/escrever o saldo atual da banca.
- Registrar bilhetes gerados e atualizar seu status (pendente/ganho/perdido).

O arquivo físico do banco (bot_apostas.db) é criado automaticamente no
diretório de execução do script, definido em config.DB_PATH.
"""

import sqlite3
import logging
from datetime import datetime
from contextlib import contextmanager

import config

logger = logging.getLogger("bot_apostas.database")


@contextmanager
def conectar():
    """Context manager que garante fechamento seguro da conexão SQLite."""
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def inicializar_banco():
    """Cria as tabelas do zero, caso ainda não existam."""
    with conectar() as conn:
        cur = conn.cursor()

        cur.execute("""
            CREATE TABLE IF NOT EXISTS banca (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                saldo_atual REAL NOT NULL,
                atualizado_em TEXT NOT NULL
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS bilhetes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data_criacao TEXT NOT NULL,
                stake REAL NOT NULL,
                odd_total REAL NOT NULL,
                retorno_potencial REAL NOT NULL,
                lucro_esperado REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'pendente'
            )
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS jogos_bilhete (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bilhete_id INTEGER NOT NULL,
                jogo_descricao TEXT NOT NULL,
                mercado TEXT NOT NULL,
                selecao TEXT NOT NULL,
                odd REAL NOT NULL,
                probabilidade_modelo REAL NOT NULL,
                value_calculado REAL NOT NULL,
                FOREIGN KEY (bilhete_id) REFERENCES bilhetes (id)
            )
        """)

        # Garante que exista exatamente 1 linha na tabela de banca
        cur.execute("SELECT COUNT(*) as total FROM banca")
        if cur.fetchone()["total"] == 0:
            cur.execute(
                "INSERT INTO banca (id, saldo_atual, atualizado_em) VALUES (1, ?, ?)",
                (config.BANCA_INICIAL, datetime.utcnow().isoformat()),
            )
            logger.info("Banca inicializada com saldo de %.2f", config.BANCA_INICIAL)

    logger.info("Banco de dados pronto em '%s'.", config.DB_PATH)


def obter_saldo_banca() -> float:
    """Retorna o saldo atual persistido da banca."""
    with conectar() as conn:
        cur = conn.cursor()
        cur.execute("SELECT saldo_atual FROM banca WHERE id = 1")
        row = cur.fetchone()
        return float(row["saldo_atual"]) if row else config.BANCA_INICIAL


def atualizar_saldo_banca(novo_saldo: float):
    """Atualiza o saldo da banca (chamado após liquidação de um bilhete)."""
    with conectar() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE banca SET saldo_atual = ?, atualizado_em = ? WHERE id = 1",
            (novo_saldo, datetime.utcnow().isoformat()),
        )
    logger.info("Saldo da banca atualizado para %.2f", novo_saldo)


def registrar_bilhete(stake: float, odd_total: float, retorno_potencial: float,
                       lucro_esperado: float, jogos_selecionados: list) -> int:
    """
    Persiste um novo bilhete (aposta dupla) e as pernas (jogos) que o compõem.
    Retorna o ID do bilhete criado.
    """
    with conectar() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO bilhetes (data_criacao, stake, odd_total, retorno_potencial, lucro_esperado, status)
            VALUES (?, ?, ?, ?, ?, 'pendente')
        """, (datetime.utcnow().isoformat(), stake, odd_total, retorno_potencial, lucro_esperado))

        bilhete_id = cur.lastrowid

        for jogo in jogos_selecionados:
            cur.execute("""
                INSERT INTO jogos_bilhete
                    (bilhete_id, jogo_descricao, mercado, selecao, odd, probabilidade_modelo, value_calculado)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                bilhete_id,
                jogo["descricao"],
                jogo["mercado"],
                jogo["selecao"],
                jogo["odd"],
                jogo["probabilidade_modelo"],
                jogo["value"],
            ))

    logger.info("Bilhete #%s registrado com sucesso.", bilhete_id)
    return bilhete_id


def atualizar_status_bilhete(bilhete_id: int, status: str):
    """
    Atualiza o status de um bilhete: 'ganho', 'perdido' ou 'pendente'.
    (A liquidação automática dependeria de uma API de resultados — ver main.py)
    """
    if status not in ("pendente", "ganho", "perdido"):
        raise ValueError("Status inválido. Use 'pendente', 'ganho' ou 'perdido'.")

    with conectar() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE bilhetes SET status = ? WHERE id = ?", (status, bilhete_id))
    logger.info("Bilhete #%s marcado como '%s'.", bilhete_id, status)


def listar_bilhetes_pendentes() -> list:
    """Retorna todos os bilhetes ainda não liquidados."""
    with conectar() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM bilhetes WHERE status = 'pendente'")
        return [dict(row) for row in cur.fetchall()]
