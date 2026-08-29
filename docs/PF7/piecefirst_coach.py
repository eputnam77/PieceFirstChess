#!/usr/bin/env python3
"""
PieceFirst 7 Post-Game Coach

Usage:
    python piecefirst_coach.py game.pgn --engine "C:\\path\\to\\stockfish.exe" --depth 18 --multipv 3

Purpose:
    Post-game analysis and training. It is not intended for live assistance.

Dependency:
    pip install python-chess
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Optional, Tuple

import chess
import chess.pgn
import chess.engine


PIECE_NAMES = {
    chess.PAWN: "pawn",
    chess.KNIGHT: "knight",
    chess.BISHOP: "bishop",
    chess.ROOK: "rook",
    chess.QUEEN: "queen",
    chess.KING: "king",
}


def score_cp(score: chess.engine.PovScore, color: chess.Color) -> int:
    """Return centipawn-style score from color's point of view, with mate mapped large."""
    s = score.pov(color).score(mate_score=100000)
    return int(s if s is not None else 0)


def classify_loss(cpl: int) -> str:
    # Training thresholds, not official chess standards.
    if cpl <= 10:
        return "Excellent"
    if cpl <= 30:
        return "Good"
    if cpl <= 80:
        return "Inaccuracy"
    if cpl <= 180:
        return "Mistake"
    return "Blunder"


def material_summary(board: chess.Board) -> str:
    vals = {
        chess.PAWN: 1,
        chess.KNIGHT: 3,
        chess.BISHOP: 3,
        chess.ROOK: 5,
        chess.QUEEN: 9,
    }
    w = sum(len(board.pieces(pt, chess.WHITE)) * v for pt, v in vals.items())
    b = sum(len(board.pieces(pt, chess.BLACK)) * v for pt, v in vals.items())
    return f"White {w} / Black {b} (nominal non-king material)"


def loose_pieces(board: chess.Board, color: chess.Color) -> List[str]:
    """Simple heuristic: attacked by opponent and not defended by own side."""
    out = []
    for sq, piece in board.piece_map().items():
        if piece.color != color or piece.piece_type == chess.KING:
            continue
        attacked = board.is_attacked_by(not color, sq)
        defended = board.is_attacked_by(color, sq)
        if attacked and not defended:
            out.append(f"{PIECE_NAMES[piece.piece_type]} on {chess.square_name(sq)}")
    return out


def legal_moves_from_square(board: chess.Board, square: int) -> int:
    return sum(1 for mv in board.legal_moves if mv.from_square == square)


def worst_piece_heuristic(board: chess.Board, color: chess.Color) -> List[str]:
    """
    Ranks non-pawn, non-king pieces by current legal-move count.
    This is only a heuristic: low mobility can be strategically correct.
    """
    items: List[Tuple[int, str]] = []
    for sq, piece in board.piece_map().items():
        if piece.color != color or piece.piece_type in (chess.PAWN, chess.KING):
            continue
        mobility = legal_moves_from_square(board, sq) if board.turn == color else 0
        items.append((mobility, f"{PIECE_NAMES[piece.piece_type]} {chess.square_name(sq)}"))
    items.sort(key=lambda x: x[0])
    return [f"{name} (legal-move mobility {mob})" for mob, name in items[:3]]


def move_tags(board: chess.Board, move: chess.Move) -> List[str]:
    tags = []
    if board.gives_check(move):
        tags.append("check")
    if board.is_capture(move):
        tags.append("capture")
    if move.promotion:
        tags.append("promotion")
    if board.is_castling(move):
        tags.append("castle")
    piece = board.piece_at(move.from_square)
    if piece:
        tags.append(PIECE_NAMES[piece.piece_type])
    return tags


def pv_to_san(board: chess.Board, pv: List[chess.Move], max_plies: int = 8) -> str:
    b = board.copy()
    parts = []
    for mv in pv[:max_plies]:
        try:
            parts.append(b.san(mv))
            b.push(mv)
        except Exception:
            break
    return " ".join(parts)


def pf_failure_hint(board: chess.Board, played: chess.Move, best: chess.Move, cpl: int) -> str:
    """Heuristic mapping from engine result to a PieceFirst training category."""
    if cpl <= 30:
        return "No major process failure detected"
    if board.is_check():
        return "PF2 SAFETY — check response/calculation"
    if board.gives_check(best) or board.is_capture(best):
        return "PF3 FORCE — forcing move may have been missed"
    if board.is_capture(played) and cpl > 80:
        return "PF6 CALCULATE — capture likely needed deeper verification"
    if board.piece_at(played.from_square) and board.piece_at(played.from_square).piece_type == chess.PAWN:
        return "PF4 BREAK / pawn discipline — irreversible pawn move deserves review"
    return "PF5/6 — candidate generation, worst-piece improvement, or calculation"


def analyse_position(
    engine: chess.engine.SimpleEngine,
    board: chess.Board,
    played: chess.Move,
    depth: int,
    multipv: int,
) -> Dict:
    mover = board.turn

    best_infos = engine.analyse(
        board,
        chess.engine.Limit(depth=depth),
        multipv=multipv,
    )
    if isinstance(best_infos, dict):
        best_infos = [best_infos]

    best_info = best_infos[0]
    best_move = best_info["pv"][0]
    best_score = score_cp(best_info["score"], mover)

    played_info = engine.analyse(
        board,
        chess.engine.Limit(depth=depth),
        root_moves=[played],
    )
    played_score = score_cp(played_info["score"], mover)

    cpl = max(0, best_score - played_score)

    candidates = []
    for info in best_infos:
        pv = info.get("pv", [])
        if not pv:
            continue
        candidates.append({
            "move": board.san(pv[0]),
            "score_cp": score_cp(info["score"], mover),
            "pv": pv_to_san(board, pv),
        })

    return {
        "best_move": board.san(best_move),
        "played_move": board.san(played),
        "best_score_cp": best_score,
        "played_score_cp": played_score,
        "centipawn_loss": cpl,
        "classification": classify_loss(cpl),
        "pf_hint": pf_failure_hint(board, played, best_move, cpl),
        "candidates": candidates,
        "tags": move_tags(board, played),
        "in_check": board.is_check(),
        "loose_mover": loose_pieces(board, mover),
        "loose_opponent": loose_pieces(board, not mover),
        "worst_piece": worst_piece_heuristic(board, mover),
        "material": material_summary(board),
    }


def load_first_game(path: Path) -> chess.pgn.Game:
    with path.open("r", encoding="utf-8", errors="replace") as f:
        game = chess.pgn.read_game(f)
    if game is None:
        raise ValueError("No PGN game found.")
    return game


def report_game(
    game: chess.pgn.Game,
    engine: chess.engine.SimpleEngine,
    depth: int,
    multipv: int,
    only_errors: bool,
) -> str:
    board = game.board()
    lines = []
    headers = game.headers

    lines.append("# PieceFirst 7 Game Review")
    lines.append("")
    lines.append(f"- White: {headers.get('White', '?')}")
    lines.append(f"- Black: {headers.get('Black', '?')}")
    lines.append(f"- Result: {headers.get('Result', '?')}")
    lines.append(f"- Event: {headers.get('Event', '?')}")
    lines.append(f"- Engine depth: {depth}")
    lines.append(f"- MultiPV: {multipv}")
    lines.append("")
    lines.append("Centipawn-loss labels are training heuristics, not official categories.")
    lines.append("")

    node = game
    ply = 0

    while node.variations:
        nxt = node.variation(0)
        move = nxt.move
        ply += 1
        move_no = board.fullmove_number
        mover_name = "White" if board.turn == chess.WHITE else "Black"
        san_played = board.san(move)

        info = analyse_position(engine, board, move, depth, multipv)

        if (not only_errors) or info["centipawn_loss"] > 30:
            move_label = f"{move_no}." if board.turn == chess.WHITE else f"{move_no}..."
            lines.append(f"## {move_label}{san_played} — {mover_name}")
            lines.append("")
            lines.append(f"- Classification: **{info['classification']}**")
            lines.append(f"- Centipawn loss: **{info['centipawn_loss']}**")
            lines.append(f"- Best move: **{info['best_move']}**")
            lines.append(f"- PF diagnosis: **{info['pf_hint']}**")
            lines.append(f"- Move tags: {', '.join(info['tags']) if info['tags'] else 'quiet move'}")
            lines.append(f"- Material before move: {info['material']}")
            if info["loose_mover"]:
                lines.append(f"- Loose own pieces: {', '.join(info['loose_mover'])}")
            if info["loose_opponent"]:
                lines.append(f"- Loose opponent pieces: {', '.join(info['loose_opponent'])}")
            if info["worst_piece"]:
                lines.append(f"- Low-mobility piece candidates: {', '.join(info['worst_piece'])}")
            lines.append("")
            lines.append("Top engine candidates:")
            for cand in info["candidates"]:
                lines.append(f"- `{cand['move']}` ({cand['score_cp']} cp): {cand['pv']}")
            lines.append("")
            lines.append("Human review prompts:")
            lines.append("- What did the opponent's previous move change?")
            lines.append("- Which checks, captures, and threats did I consider?")
            lines.append("- What candidate did I omit?")
            lines.append("- What was my worst piece?")
            lines.append("- Which PieceFirst step should I train?")
            lines.append("")

        board.push(move)
        node = nxt

    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser(description="PieceFirst 7 Stockfish-assisted PGN reviewer")
    ap.add_argument("pgn", type=Path, help="PGN file containing at least one game")
    ap.add_argument("--engine", required=True, help="Path to Stockfish executable")
    ap.add_argument("--depth", type=int, default=16, help="Stockfish search depth (default 16)")
    ap.add_argument("--multipv", type=int, default=3, help="Number of candidate lines (default 3)")
    ap.add_argument("--threads", type=int, default=4, help="Stockfish Threads option")
    ap.add_argument("--hash", dest="hash_mb", type=int, default=512, help="Stockfish Hash in MB")
    ap.add_argument("--only-errors", action="store_true", help="Show only moves over 30 cp loss")
    ap.add_argument("--out", type=Path, help="Output Markdown path")
    args = ap.parse_args()

    game = load_first_game(args.pgn)

    engine = chess.engine.SimpleEngine.popen_uci(args.engine)
    try:
        cfg = {}
        if "Threads" in engine.options:
            cfg["Threads"] = args.threads
        if "Hash" in engine.options:
            cfg["Hash"] = args.hash_mb
        if cfg:
            engine.configure(cfg)

        report = report_game(
            game=game,
            engine=engine,
            depth=args.depth,
            multipv=max(1, args.multipv),
            only_errors=args.only_errors,
        )
    finally:
        engine.quit()

    out = args.out or args.pgn.with_name(args.pgn.stem + "_piecefirst_review.md")
    out.write_text(report, encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
