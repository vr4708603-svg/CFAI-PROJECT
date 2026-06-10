
import streamlit as st
import chess
import plotly.graph_objects as go
import pandas as pd
import time
from engine import get_best_moves, get_position_evaluation, format_score, get_game_phase

st.set_page_config(
    page_title="Chess AI Engine",
    page_icon="♟",
    layout="wide",
    initial_sidebar_state="expanded",
)

PIECE_NAMES = {
    chess.PAWN: "Pawns", chess.KNIGHT: "Knights", chess.BISHOP: "Bishops",
    chess.ROOK: "Rooks", chess.QUEEN: "Queens",
}
MATERIAL_VALS = {
    chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9,
}
PIECE_SYM = {
    "K": "♔", "Q": "♕", "R": "♖", "B": "♗", "N": "♘", "P": "♙",
    "k": "♚", "q": "♛", "r": "♜", "b": "♝", "n": "♞", "p": "♟",
}

LIGHT_SQ    = "#F0D9B5"
DARK_SQ     = "#B58863"
SEL_SQ      = "#5a9e5a"
LEGAL_SQ    = "#cdd26a"
CAPTURE_SQ  = "#e04040"
LAST_SQ     = "#d6c84a"
CHECK_SQ    = "#e04040"


def sq_is_light(file: int, rank: int) -> bool:
    """a1 (file=0,rank=0) is dark; (file+rank) odd → light."""
    return (file + rank) % 2 == 1


def init_state():
    defaults = {
        "board":         chess.Board(),
        "eval_history":  [0.0],
        "move_history":  [],
        "best_moves":    [],
        "last_analysis": None,
        "selected_sq":   None,
        "legal_targets": [],
        "status_msg":    "",
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

init_state()
board: chess.Board = st.session_state.board


def fen_grid(b: chess.Board):
    """Returns 8 rows (rank-8 first), each with 8 piece-char strings."""
    grid = []
    for row in b.fen().split()[0].split("/"):
        rank_row: list[str] = []
        for ch in row:
            if ch.isdigit():
                rank_row.extend([""] * int(ch))
            else:
                rank_row.append(ch)
        grid.append(rank_row)
    return grid


def handle_click(sq: int, depth: int, num_sugg: int):
    piece    = board.piece_at(sq)
    selected = st.session_state.selected_sq

    if selected is None:
        if piece and piece.color == board.turn:
            st.session_state.selected_sq   = sq
            st.session_state.legal_targets = [
                m.to_square for m in board.legal_moves if m.from_square == sq
            ]
            st.session_state.status_msg = f"Selected {chess.square_name(sq).upper()}"
        else:
            st.session_state.status_msg = "Click one of your pieces first."
        return

    if sq == selected:
        st.session_state.selected_sq   = None
        st.session_state.legal_targets = []
        st.session_state.status_msg    = "Deselected."
        return

    if piece and piece.color == board.turn:
        st.session_state.selected_sq   = sq
        st.session_state.legal_targets = [
            m.to_square for m in board.legal_moves if m.from_square == sq
        ]
        st.session_state.status_msg = f"Selected {chess.square_name(sq).upper()}"
        return

    move = chess.Move(selected, sq)
    if (board.piece_at(selected)
            and board.piece_at(selected).piece_type == chess.PAWN
            and chess.square_rank(sq) in (0, 7)):
        move = chess.Move(selected, sq, promotion=chess.QUEEN)

    if move in board.legal_moves:
        san = board.san(move)
        board.push(move)
        st.session_state.move_history.append(san)
        st.session_state.selected_sq   = None
        st.session_state.legal_targets = []
        ev   = get_position_evaluation(board)
        st.session_state.eval_history.append(float(ev))
        best = get_best_moves(board, depth=min(depth, 3), num_moves=num_sugg)
        st.session_state.best_moves = best
        st.session_state.status_msg = f"Played {san}"
    else:
        st.session_state.status_msg  = (
            f"Illegal: {chess.square_name(selected)} → {chess.square_name(sq)}"
        )
        st.session_state.selected_sq   = None
        st.session_state.legal_targets = []


def material_balance(b: chess.Board):
    w = bk = 0
    for sq in chess.SQUARES:
        p = b.piece_at(sq)
        if p and p.piece_type != chess.KING:
            v = MATERIAL_VALS.get(p.piece_type, 0)
            if p.color == chess.WHITE: w  += v
            else:                      bk += v
    return w, bk


def eval_bar_html(raw_score: float) -> str:
    clamped   = max(-1000.0, min(1000.0, raw_score))
    white_pct = (clamped + 1000) / 2000 * 100
    label     = format_score(int(raw_score), chess.WHITE)
    return (
        f'<div style="margin:4px 0 8px 0;">'
        f'<div style="font-size:13px;font-weight:600;text-align:center;margin-bottom:4px;">'
        f'Evaluation: {label}</div>'
        f'<div style="width:100%;height:20px;background:#1a1a2e;border-radius:3px;'
        f'overflow:hidden;border:1px solid #444;">'
        f'<div style="width:{white_pct:.1f}%;height:100%;'
        f'background:linear-gradient(90deg,#bbb,#fff);"></div>'
        f'</div>'
        f'<div style="display:flex;justify-content:space-between;font-size:10px;'
        f'color:#888;margin-top:2px;"><span>⬛ Black</span><span>White ⬜</span></div>'
        f'</div>'
    )


_BR = (
    "div[data-testid='stMain'] "
    "div[data-testid='stHorizontalBlock']"
    ":has(>div[data-testid='stColumn']:nth-child(9))"
    ":not(:has(>div[data-testid='stColumn']:nth-child(10)))"
)

BASE_BOARD_CSS = f"""
<style>
/* ── Square buttons ── */
div[data-testid="stButton"] > button {{
    width:  62px !important; height: 62px !important;
    min-width: 62px !important; min-height: 62px !important;
    padding: 0 !important; margin: 0 !important;
    border: none !important; border-radius: 2px !important;
    font-size: 36px !important; line-height: 1 !important;
    display: flex !important; align-items: center !important;
    justify-content: center !important;
    box-shadow: none !important; transition: filter 0.1s, box-shadow 0.1s;
}}
div[data-testid="stButton"] > button:hover {{
    filter: brightness(1.18) !important;
    box-shadow: inset 0 0 0 3px rgba(0,0,0,0.4) !important;
}}
div[data-testid="stHorizontalBlock"] {{ gap: 0 !important; }}
div[data-testid="stColumn"]          {{ padding: 0 !important; min-width: 0 !important; }}

/* ── Default checkerboard: ODD rows ── */
{_BR}:nth-of-type(odd) >div[data-testid="stColumn"]:nth-child(even) button {{
    background:#F0D9B5 !important; border-color:#F0D9B5 !important; color:#111 !important;
}}
{_BR}:nth-of-type(odd) >div[data-testid="stColumn"]:nth-child(odd):not(:nth-child(1)) button {{
    background:#B58863 !important; border-color:#B58863 !important; color:#fff !important;
}}

/* ── Default checkerboard: EVEN rows ── */
{_BR}:nth-of-type(even) >div[data-testid="stColumn"]:nth-child(even) button {{
    background:#B58863 !important; border-color:#B58863 !important; color:#fff !important;
}}
{_BR}:nth-of-type(even) >div[data-testid="stColumn"]:nth-child(odd):not(:nth-child(1)) button {{
    background:#F0D9B5 !important; border-color:#F0D9B5 !important; color:#111 !important;
}}
</style>
"""


def highlight_css(board: chess.Board, selected_sq, legal_targets) -> str:
    legal_set = set(legal_targets or [])
    last_from = last_to = -1
    if board.move_stack:
        lm = board.peek()
        last_from, last_to = lm.from_square, lm.to_square
    check_sq = -1
    if board.is_check():
        ks = board.king(board.turn)
        if ks is not None:
            check_sq = ks

    overrides: dict[int, tuple[str, str]] = {}

    for sq in (last_from, last_to):
        if sq >= 0:
            overrides[sq] = (LAST_SQ, "#111")
    for sq in legal_set:
        if board.piece_at(sq):
            overrides[sq] = (CAPTURE_SQ, "#fff")
        else:
            overrides[sq] = (LEGAL_SQ,   "#111")
    if selected_sq is not None:
        overrides[selected_sq] = (SEL_SQ, "#fff")
    if check_sq >= 0:
        overrides[check_sq] = (CHECK_SQ, "#fff")

    if not overrides:
        return ""

    rules: list[str] = []
    for sq, (bg, fg) in overrides.items():
        file  = sq % 8
        rank  = sq // 8
        css_row = 8 - rank
        css_col = file + 2
        rules.append(
            f"{_BR}:nth-of-type({css_row})"
            f">div[data-testid='stColumn']:nth-child({css_col}) button"
            f"{{background:{bg}!important;border-color:{bg}!important;"
            f"color:{fg}!important;}}"
        )

    return f"<style>{''.join(rules)}</style>"


with st.sidebar:
    st.markdown("## ♟ Chess AI Engine")
    st.markdown("*Click a piece, then its destination*")
    st.divider()
    depth    = st.slider("Search Depth", 1, 6, 4)
    num_sugg = st.slider("Suggestions",  1, 5, 3)
    st.divider()
    sc1, sc2 = st.columns(2)
    with sc1:
        if st.button("🔄 New Game", use_container_width=True):
            for k in list(st.session_state.keys()):
                del st.session_state[k]
            st.rerun()
    with sc2:
        if st.button("↩ Undo", use_container_width=True):
            if board.move_stack:
                board.pop()
                if len(st.session_state.eval_history) > 1:
                    st.session_state.eval_history.pop()
                if st.session_state.move_history:
                    st.session_state.move_history.pop()
                st.session_state.best_moves    = []
                st.session_state.selected_sq   = None
                st.session_state.legal_targets = []
            st.rerun()
    st.divider()
    st.markdown("### Game Info")
    wmat, bmat = material_balance(board)
    diff    = wmat - bmat
    mat_str = (f"White +{diff}" if diff > 0
               else f"Black +{abs(diff)}" if diff < 0
               else "Equal")
    st.metric("Move",        len(board.move_stack) // 2 + 1)
    st.metric("Phase",       get_game_phase(board))
    st.metric("Material",    mat_str)
    st.metric("Legal Moves", board.legal_moves.count())
    st.metric("Turn",        "⬜ White" if board.turn == chess.WHITE else "⬛ Black")
    if board.is_check():
        st.warning("⚠️ In Check!")
    if st.session_state.last_analysis:
        a = st.session_state.last_analysis
        st.markdown(f"*Last analysis: depth {a['depth']} in {a['time']:.2f}s*")


st.markdown(BASE_BOARD_CSS, unsafe_allow_html=True)

hl = highlight_css(board, st.session_state.selected_sq, st.session_state.legal_targets)
if hl:
    st.markdown(hl, unsafe_allow_html=True)

st.markdown("## ♟ Chess AI Engine")
left, right = st.columns([1.05, 1.1], gap="large")

with left:
    if st.session_state.status_msg:
        msg = st.session_state.status_msg
        if "Illegal" in msg:
            st.error(msg, icon="⛔")
        elif "Played" in msg or "Engine" in msg:
            st.success(msg, icon="✅")
        else:
            st.info(msg, icon="ℹ️")

    if board.is_game_over():
        result = board.result()
        if board.is_checkmate():
            winner = "Black" if board.turn == chess.WHITE else "White"
            st.success(f"🏆 Checkmate! {winner} wins! ({result})")
        elif board.is_stalemate():
            st.info("🤝 Stalemate — Draw!")
        elif board.is_insufficient_material():
            st.info("🤝 Draw — Insufficient material.")
        else:
            st.info(f"Game over: {result}")

    grid       = fen_grid(board)
    clicked_sq = None

    st.markdown(
        "<div style='display:flex;padding-left:26px;margin-bottom:0'>"
        + "".join(
            f"<div style='width:62px;text-align:center;font-size:12px;"
            f"color:#aaa;font-weight:600'>{c}</div>"
            for c in "abcdefgh"
        )
        + "</div>",
        unsafe_allow_html=True,
    )

    for rank in range(7, -1, -1):
        row_data    = grid[7 - rank]
        rank_col, *sq_cols = st.columns([0.38] + [1] * 8, gap="small")

        with rank_col:
            st.markdown(
                f"<div style='height:62px;display:flex;align-items:center;"
                f"justify-content:center;font-size:12px;color:#aaa;font-weight:600'>"
                f"{rank + 1}</div>",
                unsafe_allow_html=True,
            )

        for file in range(8):
            sq   = chess.square(file, rank)
            pc   = row_data[file]
            sym  = PIECE_SYM.get(pc, " ") if pc else " "
            with sq_cols[file]:
                if st.button(sym, key=f"sq_{sq}", use_container_width=True):
                    clicked_sq = sq

    if clicked_sq is not None:
        handle_click(clicked_sq, depth, num_sugg)
        st.rerun()

with right:
    ev_raw = st.session_state.eval_history[-1] if st.session_state.eval_history else 0.0
    st.markdown(eval_bar_html(ev_raw), unsafe_allow_html=True)

    if st.session_state.best_moves:
        st.markdown("### 🎯 Engine Suggestions")
        rows = []
        for i, m in enumerate(st.session_state.best_moves):
            medal = ["🥇","🥈","🥉"][i] if i < 3 else f"{i+1}."
            rows.append({
                "Rank":  medal,
                "Move":  m["san"],
                "Eval":  m["score_display"],
            })
        df = pd.DataFrame(rows)
        st.dataframe(df, use_container_width=True, hide_index=True)

        best = st.session_state.best_moves[0]
        st.markdown(
            f"**Best move:** `{best['san']}`&nbsp;&nbsp; "
            f"**Eval:** {best['score_display']}"
        )
        ev_val  = ev_raw / 100.0
        pos_str = ("Winning position" if ev_val > 1.5
                   else "Losing position" if ev_val < -1.5
                   else "Equal position")
        color   = ("🟢" if ev_val > 1.5 else "🔴" if ev_val < -1.5 else "🟡")
        st.markdown(f"**Position:** {color} {pos_str}")

    st.markdown("### 📈 Evaluation History")
    if len(st.session_state.eval_history) > 1:
        half_moves = list(range(len(st.session_state.eval_history)))
        ev_pawns   = [e / 100.0 for e in st.session_state.eval_history]
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=half_moves, y=ev_pawns, mode="lines+markers",
            line=dict(color="#4CAF50", width=2),
            marker=dict(size=5),
            name="Eval",
        ))
        fig.add_hline(y=0, line_dash="dash", line_color="gray", opacity=0.5)
        fig.update_layout(
            xaxis_title="Half-move", yaxis_title="Eval (pawns)",
            height=250, margin=dict(l=40,r=20,t=20,b=40),
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#ccc"),
            xaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
            yaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
        )
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.caption("Make a move to see the evaluation chart.")

    if st.session_state.move_history:
        st.markdown("### 📋 Move History")
        moves = st.session_state.move_history
        pairs = []
        for i in range(0, len(moves), 2):
            white_mv = moves[i]
            black_mv = moves[i+1] if i+1 < len(moves) else ""
            pairs.append({"#": i//2+1, "White": white_mv, "Black": black_mv})
        mdf = pd.DataFrame(pairs)
        st.dataframe(mdf, use_container_width=True, hide_index=True)
