<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Chess AI Engine</title>
<script src="https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', sans-serif;
    background: #1a1a2e;
    color: #e0e0e0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    background: #16213e;
    padding: 14px 24px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #0f3460;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  header h1 { font-size: 1.3rem; font-weight: 700; color: #e2b96a; }
  header span { font-size: 1.5rem; }
  .main {
    display: flex;
    flex: 1;
    gap: 0;
    padding: 20px;
    max-width: 1100px;
    margin: 0 auto;
    width: 100%;
    gap: 20px;
  }
  .left { display: flex; flex-direction: column; gap: 12px; }
  .right { flex: 1; display: flex; flex-direction: column; gap: 12px; min-width: 280px; }

  /* Board */
  .board-wrap {
    display: flex;
    gap: 0;
    user-select: none;
  }
  .rank-labels {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    padding: 4px 6px 4px 0;
    font-size: 12px;
    color: #888;
    font-weight: 600;
  }
  .rank-labels span { height: 62px; display: flex; align-items: center; }
  .board-col {
    display: flex;
    flex-direction: column;
  }
  .file-labels {
    display: flex;
    padding-left: 0;
    font-size: 12px;
    color: #888;
    font-weight: 600;
  }
  .file-labels span { width: 62px; text-align: center; }
  .board {
    display: grid;
    grid-template-columns: repeat(8, 62px);
    grid-template-rows: repeat(8, 62px);
    border: 2px solid #0f3460;
    border-radius: 3px;
    overflow: hidden;
  }
  .sq {
    width: 62px; height: 62px;
    display: flex; align-items: center; justify-content: center;
    font-size: 40px; line-height: 1;
    cursor: pointer;
    transition: filter 0.1s;
    position: relative;
  }
  .sq:hover { filter: brightness(1.15); }
  .sq.light { background: #F0D9B5; }
  .sq.dark  { background: #B58863; }
  .sq.selected { background: #5a9e5a !important; }
  .sq.legal-empty::after {
    content: '';
    position: absolute;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: rgba(0,0,0,0.18);
  }
  .sq.legal-capture { background: #e04040 !important; }
  .sq.last-move { background: #d6c84a !important; }
  .sq.in-check { background: #e04040 !important; }

  /* Sidebar panels */
  .panel {
    background: #16213e;
    border-radius: 8px;
    padding: 14px 16px;
    border: 1px solid #0f3460;
  }
  .panel h3 {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #888;
    margin-bottom: 10px;
  }
  .panel h3 .icon { margin-right: 4px; }

  .status-bar {
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    min-height: 38px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .status-bar.info    { background: #1e3a5f; border: 1px solid #2a5080; }
  .status-bar.success { background: #1a3a1a; border: 1px solid #2a5a2a; color: #7ed67e; }
  .status-bar.error   { background: #3a1a1a; border: 1px solid #5a2a2a; color: #e07070; }
  .status-bar.warn    { background: #3a2a00; border: 1px solid #5a4000; color: #e2b96a; }

  .btn {
    padding: 8px 14px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.88rem;
    font-weight: 600;
    transition: filter 0.15s, transform 0.1s;
    color: #fff;
  }
  .btn:hover:not(:disabled) { filter: brightness(1.15); }
  .btn:active:not(:disabled) { transform: scale(0.97); }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-primary { background: #0f3460; }
  .btn-secondary { background: #2a3a5a; }
  .btn-danger { background: #5a1a1a; }
  .btn-row { display: flex; gap: 8px; }

  .metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .metric {
    background: #1a2540;
    border-radius: 6px;
    padding: 8px 10px;
    border: 1px solid #0f3460;
  }
  .metric-label { font-size: 0.72rem; color: #888; text-transform: uppercase; letter-spacing: 0.06em; }
  .metric-value { font-size: 1.05rem; font-weight: 700; color: #e2b96a; margin-top: 2px; }

  .eval-bar-container { margin: 4px 0 10px; }
  .eval-label { font-size: 13px; font-weight: 600; text-align: center; margin-bottom: 5px; color: #e2b96a; }
  .eval-bar-outer {
    width: 100%; height: 20px;
    background: #1a1a2e;
    border-radius: 3px;
    overflow: hidden;
    border: 1px solid #444;
  }
  .eval-bar-inner {
    height: 100%;
    background: linear-gradient(90deg, #bbb, #fff);
    transition: width 0.4s ease;
  }
  .eval-bar-footer {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #666;
    margin-top: 2px;
  }

  .move-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .move-table th {
    text-align: left;
    font-size: 0.75rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 4px 6px;
    border-bottom: 1px solid #0f3460;
  }
  .move-table td {
    padding: 5px 6px;
    border-bottom: 1px solid #0f1a30;
    color: #d0d0d0;
  }
  .move-table tr:last-child td { border-bottom: none; }
  .move-table td:first-child { color: #666; font-size: 0.78rem; }
  .medal { font-size: 1rem; }

  .depth-row { display: flex; align-items: center; gap: 10px; }
  .depth-row label { font-size: 0.85rem; color: #aaa; white-space: nowrap; }
  .depth-row input[type=range] { flex: 1; accent-color: #e2b96a; }
  .depth-row span { font-size: 0.9rem; font-weight: 700; color: #e2b96a; min-width: 14px; text-align: right; }

  .loading-overlay {
    position: fixed; inset: 0;
    background: rgba(10,12,24,0.92);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 100;
    gap: 18px;
  }
  .loading-overlay h2 { color: #e2b96a; font-size: 1.3rem; }
  .loading-overlay p { color: #888; font-size: 0.9rem; max-width: 320px; text-align: center; }
  .spinner {
    width: 44px; height: 44px;
    border: 4px solid #0f3460;
    border-top-color: #e2b96a;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .thinking-bar {
    display: none;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: #e2b96a;
    padding: 6px 0;
  }
  .thinking-bar.active { display: flex; }
  .thinking-bar .mini-spinner {
    width: 16px; height: 16px;
    border: 2px solid #0f3460;
    border-top-color: #e2b96a;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .history-list {
    max-height: 160px;
    overflow-y: auto;
    font-size: 0.85rem;
  }
  .history-list::-webkit-scrollbar { width: 4px; }
  .history-list::-webkit-scrollbar-thumb { background: #0f3460; border-radius: 2px; }
  .pair-row { display: flex; gap: 0; padding: 3px 0; border-bottom: 1px solid #0f1a30; }
  .pair-row:last-child { border-bottom: none; }
  .pair-num { color: #666; font-size: 0.78rem; width: 26px; padding-top: 1px; }
  .pair-w { width: 72px; color: #e0e0e0; }
  .pair-b { color: #b0b0b0; }

  @media (max-width: 750px) {
    .main { flex-direction: column; padding: 10px; }
    .right { min-width: unset; }
    .sq { width: 44px; height: 44px; font-size: 28px; }
    .board { grid-template-columns: repeat(8, 44px); grid-template-rows: repeat(8, 44px); }
    .rank-labels span { height: 44px; }
    .file-labels span { width: 44px; }
  }
</style>
</head>
<body>

<div class="loading-overlay" id="loadingOverlay">
  <div class="spinner"></div>
  <h2>♟ Chess AI Engine</h2>
  <p id="loadingMsg">Loading Python runtime (Pyodide)…</p>
</div>

<header>
  <span>♟</span>
  <h1>Chess AI Engine</h1>
</header>

<div class="main">
  <div class="left">
    <div id="statusBar" class="status-bar info">♟ Click a piece to start playing</div>
    <div class="board-wrap">
      <div class="rank-labels" id="rankLabels"></div>
      <div class="board-col">
        <div class="board" id="board"></div>
        <div class="file-labels" id="fileLabels"></div>
      </div>
    </div>
    <div class="thinking-bar" id="thinkingBar">
      <div class="mini-spinner"></div>
      <span>Engine thinking…</span>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="newGame()">🔄 New Game</button>
      <button class="btn btn-secondary" onclick="undoMove()">↩ Undo</button>
      <button class="btn btn-danger" id="engineBtn" onclick="toggleEngineMode()">🤖 Engine: OFF</button>
    </div>
    <div class="panel">
      <div class="depth-row">
        <label>Search depth:</label>
        <input type="range" id="depthSlider" min="1" max="5" value="3" oninput="document.getElementById('depthVal').textContent=this.value">
        <span id="depthVal">3</span>
      </div>
    </div>
  </div>

  <div class="right">
    <div class="panel">
      <h3><span class="icon">📊</span>Position</h3>
      <div class="eval-bar-container">
        <div class="eval-label" id="evalLabel">0.00</div>
        <div class="eval-bar-outer"><div class="eval-bar-inner" id="evalBar" style="width:50%"></div></div>
        <div class="eval-bar-footer"><span>⬛ Black</span><span>White ⬜</span></div>
      </div>
      <div class="metrics" id="metrics">
        <div class="metric"><div class="metric-label">Move</div><div class="metric-value" id="mMove">1</div></div>
        <div class="metric"><div class="metric-label">Phase</div><div class="metric-value" id="mPhase">Opening</div></div>
        <div class="metric"><div class="metric-label">Material</div><div class="metric-value" id="mMaterial">Equal</div></div>
        <div class="metric"><div class="metric-label">Turn</div><div class="metric-value" id="mTurn">⬜ White</div></div>
      </div>
    </div>

    <div class="panel" id="suggestPanel">
      <h3><span class="icon">🎯</span>Engine Suggestions</h3>
      <table class="move-table">
        <thead><tr><th>Rank</th><th>Move</th><th>Eval</th></tr></thead>
        <tbody id="suggestBody"><tr><td colspan="3" style="color:#666;font-style:italic;padding:8px 6px">Make a move to see suggestions</td></tr></tbody>
      </table>
    </div>

    <div class="panel">
      <h3><span class="icon">📋</span>Move History</h3>
      <div class="history-list" id="historyList"><span style="color:#666;font-style:italic;font-size:0.85rem">No moves yet</span></div>
    </div>
  </div>
</div>

<script>
// ── State ──────────────────────────────────────────────────────────────
let pyodide = null;
let gameReady = false;
let selectedSq = null;
let legalTargets = [];
let lastFrom = -1, lastTo = -1;
let moveHistory = [];
let evalHistory = [0];
let engineMode = false;
let thinking = false;

const PIECE_UNICODE = {
  'P':'♙','N':'♘','B':'♗','R':'♖','Q':'♕','K':'♔',
  'p':'♟','n':'♞','b':'♝','r':'♜','q':'♛','k':'♚'
};

// ── Pyodide boot ───────────────────────────────────────────────────────
async function boot() {
  setLoading('Loading Python runtime (Pyodide)…');
  pyodide = await loadPyodide();
  setLoading('Installing python-chess via micropip…');
  await pyodide.loadPackage('micropip');
  await pyodide.runPythonAsync(`
import micropip
await micropip.install('chess')
`);
  setLoading('Initialising chess engine…');
  await pyodide.runPythonAsync(ENGINE_PY);
  await pyodide.runPythonAsync(`
import chess as _chess
_board = _chess.Board()
def _fen(): return _board.fen()
def _is_game_over(): return _board.is_game_over()
def _is_check(): return _board.is_check()
def _turn(): return 'white' if _board.turn == _chess.WHITE else 'black'
def _legal_moves_from(sq):
    return [m.to_square for m in _board.legal_moves if m.from_square == sq]
def _make_move(from_sq, to_sq):
    promo = None
    p = _board.piece_at(from_sq)
    if p and p.piece_type == _chess.PAWN and _chess.square_rank(to_sq) in (0,7):
        promo = _chess.QUEEN
    m = _chess.Move(from_sq, to_sq, promotion=promo)
    if m not in _board.legal_moves:
        return None
    san = _board.san(m)
    _board.push(m)
    return san
def _undo():
    if _board.move_stack:
        _board.pop()
        return True
    return False
def _new_game():
    _board.reset()
def _get_eval():
    return float(evaluate_board(_board))
def _get_suggestions(depth, n):
    import json
    bm = get_best_moves(_board, depth=depth, num_moves=n)
    return json.dumps([{'san':x['san'],'score_display':x['score_display']} for x in bm])
def _get_engine_move(depth):
    bm = get_best_moves(_board, depth=depth, num_moves=1)
    if not bm: return None
    return bm[0]['uci']
def _piece_map():
    import json
    return json.dumps({sq: str(p) for sq,p in _board.piece_map().items()})
def _move_stack_len():
    return len(_board.move_stack)
def _last_move():
    if _board.move_stack:
        m = _board.peek()
        return [m.from_square, m.to_square]
    return [-1,-1]
def _get_game_phase_py():
    return get_game_phase(_board)
def _material():
    vals = {1:1,2:3,3:3,4:5,5:9}
    w=b=0
    for sq in _chess.SQUARES:
        p = _board.piece_at(sq)
        if p and p.piece_type != _chess.KING:
            v = vals.get(p.piece_type, 0)
            if p.color == _chess.WHITE: w+=v
            else: b+=v
    return [w,b]
def _result():
    if _board.is_checkmate():
        winner = 'Black' if _board.turn == _chess.WHITE else 'White'
        return f'Checkmate! {winner} wins!'
    if _board.is_stalemate(): return 'Stalemate — Draw'
    if _board.is_insufficient_material(): return 'Draw — Insufficient material'
    return _board.result()
def _king_sq():
    k = _board.king(_board.turn)
    return k if k is not None else -1
`);
  gameReady = true;
  document.getElementById('loadingOverlay').style.display = 'none';
  buildBoard();
  renderBoard();
  updateSidebar();
}

// ── Engine Python source (embedded) ───────────────────────────────────
const ENGINE_PY = `
import chess
import time

PIECE_VALUES = {
    chess.PAWN: 100, chess.KNIGHT: 320, chess.BISHOP: 330,
    chess.ROOK: 500, chess.QUEEN: 900, chess.KING: 20000,
}
PAWN_TABLE = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
]
KNIGHT_TABLE = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
]
BISHOP_TABLE = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
]
ROOK_TABLE = [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
]
QUEEN_TABLE = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
]
KING_MID_TABLE = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
]
KING_END_TABLE = [
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50,
]
TABLES = {
    chess.PAWN: PAWN_TABLE, chess.KNIGHT: KNIGHT_TABLE,
    chess.BISHOP: BISHOP_TABLE, chess.ROOK: ROOK_TABLE,
    chess.QUEEN: QUEEN_TABLE, chess.KING: KING_MID_TABLE,
}
def is_endgame(board):
    queens = len(board.pieces(chess.QUEEN, chess.WHITE)) + len(board.pieces(chess.QUEEN, chess.BLACK))
    if queens == 0: return True
    minor_major = sum(len(board.pieces(pt, c)) for pt in [chess.ROOK, chess.BISHOP, chess.KNIGHT] for c in [chess.WHITE, chess.BLACK])
    return queens <= 2 and minor_major <= 4
def pst_index(square, color):
    rank = square // 8; file = square % 8
    return (7-rank)*8+file if color == chess.WHITE else rank*8+file
def evaluate_board(board):
    if board.is_checkmate(): return -99999 if board.turn == chess.WHITE else 99999
    if board.is_stalemate() or board.is_insufficient_material(): return 0
    endgame = is_endgame(board); score = 0
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if not piece: continue
        val = PIECE_VALUES[piece.piece_type]
        pst = KING_END_TABLE[pst_index(square, piece.color)] if (endgame and piece.piece_type == chess.KING) else TABLES[piece.piece_type][pst_index(square, piece.color)]
        total = val + pst
        score += total if piece.color == chess.WHITE else -total
    cur = board.turn
    board.turn = chess.WHITE; wm = len(list(board.legal_moves))
    board.turn = chess.BLACK; bm = len(list(board.legal_moves))
    board.turn = cur; score += (wm-bm)*4
    for sq in chess.SQUARES:
        p = board.piece_at(sq)
        if p and p.piece_type == chess.PAWN:
            file = chess.square_file(sq)
            pawns_on_file = len([s for s in board.pieces(chess.PAWN, p.color) if chess.square_file(s) == file])
            if pawns_on_file > 1:
                penalty = -15*(pawns_on_file-1)
                score += penalty if p.color == chess.WHITE else -penalty
    return score
def order_moves(board, moves):
    def move_score(move):
        sc = 0
        if board.is_capture(move):
            victim = board.piece_at(move.to_square); attacker = board.piece_at(move.from_square)
            if victim and attacker: sc += 10*PIECE_VALUES.get(victim.piece_type,0)-PIECE_VALUES.get(attacker.piece_type,0)
        if move.promotion: sc += PIECE_VALUES.get(move.promotion,0)
        if board.gives_check(move): sc += 80
        return sc
    return sorted(moves, key=move_score, reverse=True)
def minimax(board, depth, alpha, beta, maximizing):
    if depth == 0 or board.is_game_over(): return evaluate_board(board)
    moves = order_moves(board, list(board.legal_moves))
    if maximizing:
        best = float('-inf')
        for move in moves:
            board.push(move); val = minimax(board, depth-1, alpha, beta, False); board.pop()
            best = max(best, val); alpha = max(alpha, val)
            if beta <= alpha: break
        return best
    else:
        best = float('inf')
        for move in moves:
            board.push(move); val = minimax(board, depth-1, alpha, beta, True); board.pop()
            best = min(best, val); beta = min(beta, val)
            if beta <= alpha: break
        return best
def get_best_moves(board, depth=3, num_moves=5):
    if board.is_game_over(): return []
    moves = order_moves(board, list(board.legal_moves))
    is_white = board.turn == chess.WHITE; results = []
    for move in moves:
        board.push(move)
        score = minimax(board, depth-1, float('-inf'), float('inf'), not is_white)
        board.pop()
        san = board.san(move)
        results.append({'move': move,'uci': move.uci(),'san': san,'score': score,'score_display': format_score(score, board.turn)})
    results.sort(key=lambda x: x['score'], reverse=is_white)
    return results[:num_moves]
def format_score(score, turn):
    if abs(score) >= 9000:
        moves_to_mate = (99999-abs(score))//2+1
        if score > 0: return f"M{moves_to_mate}" if turn == chess.WHITE else f"-M{moves_to_mate}"
        else: return f"-M{moves_to_mate}" if turn == chess.WHITE else f"M{moves_to_mate}"
    display = score/100.0
    if turn == chess.BLACK: display = -display
    return f"{display:+.2f}"
def evaluate_board_ext(board): return evaluate_board(board)
def get_game_phase(board):
    pieces = sum(len(board.pieces(pt, c)) for pt in [chess.ROOK, chess.BISHOP, chess.KNIGHT, chess.QUEEN] for c in [chess.WHITE, chess.BLACK])
    return "Opening" if pieces >= 12 else ("Middlegame" if pieces >= 6 else "Endgame")
`;

// ── Board rendering ────────────────────────────────────────────────────
function buildBoard() {
  const board = document.getElementById('board');
  const ranks = document.getElementById('rankLabels');
  const files = document.getElementById('fileLabels');
  board.innerHTML = '';
  ranks.innerHTML = '';
  files.innerHTML = '';
  for (let r = 7; r >= 0; r--) {
    const sp = document.createElement('span');
    sp.textContent = r + 1;
    ranks.appendChild(sp);
  }
  const fileChs = 'abcdefgh';
  for (let f = 0; f < 8; f++) {
    const sp = document.createElement('span');
    sp.textContent = fileChs[f];
    files.appendChild(sp);
  }
  for (let r = 7; r >= 0; r--) {
    for (let f = 0; f < 8; f++) {
      const sq = r * 8 + f;
      const div = document.createElement('div');
      div.className = 'sq ' + ((f + r) % 2 === 1 ? 'light' : 'dark');
      div.id = 'sq' + sq;
      div.addEventListener('click', () => handleClick(sq));
      board.appendChild(div);
    }
  }
}

async function renderBoard() {
  if (!gameReady) return;
  const pieceMapJson = pyodide.globals.get('_piece_map')();
  const pieceMap = JSON.parse(pieceMapJson);
  const lm = pyodide.globals.get('_last_move')().toJs();
  lastFrom = lm[0]; lastTo = lm[1];
  const inCheck = pyodide.globals.get('_is_check')();
  const kingSq = inCheck ? pyodide.globals.get('_king_sq')() : -1;

  for (let sq = 0; sq < 64; sq++) {
    const el = document.getElementById('sq' + sq);
    if (!el) continue;
    const f = sq % 8, r = Math.floor(sq / 8);
    let cls = 'sq ' + ((f + r) % 2 === 1 ? 'light' : 'dark');
    if (sq === lastFrom || sq === lastTo) cls += ' last-move';
    if (sq === selectedSq) cls += ' selected';
    else if (legalTargets.includes(sq)) {
      cls += pieceMap[sq] ? ' legal-capture' : ' legal-empty';
    }
    if (sq === kingSq) cls += ' in-check';
    el.className = cls;
    el.textContent = pieceMap[sq] ? (PIECE_UNICODE[pieceMap[sq]] || '') : '';
  }
}

// ── Game logic ─────────────────────────────────────────────────────────
async function handleClick(sq) {
  if (!gameReady || thinking) return;
  if (pyodide.globals.get('_is_game_over')()) return;

  const turn = pyodide.globals.get('_turn')();
  const pieceMapJson = pyodide.globals.get('_piece_map')();
  const pieceMap = JSON.parse(pieceMapJson);
  const piece = pieceMap[sq];

  if (selectedSq === null) {
    const isMyPiece = piece && ((turn === 'white' && piece === piece.toUpperCase()) || (turn === 'black' && piece === piece.toLowerCase()));
    if (!isMyPiece) { setStatus('Click one of your pieces first.', 'info'); return; }
    selectedSq = sq;
    legalTargets = pyodide.globals.get('_legal_moves_from')(sq).toJs();
    setStatus(`Selected ${sqName(sq)}`, 'info');
    renderBoard();
    return;
  }

  if (sq === selectedSq) {
    selectedSq = null; legalTargets = [];
    setStatus('Deselected.', 'info');
    renderBoard(); return;
  }

  const isMyPiece2 = piece && ((turn === 'white' && piece === piece.toUpperCase()) || (turn === 'black' && piece === piece.toLowerCase()));
  if (isMyPiece2) {
    selectedSq = sq;
    legalTargets = pyodide.globals.get('_legal_moves_from')(sq).toJs();
    setStatus(`Selected ${sqName(sq)}`, 'info');
    renderBoard(); return;
  }

  const san = pyodide.globals.get('_make_move')(selectedSq, sq);
  selectedSq = null; legalTargets = [];

  if (!san) {
    setStatus(`Illegal move`, 'error');
    renderBoard(); return;
  }

  moveHistory.push(san);
  const ev = pyodide.globals.get('_get_eval')();
  evalHistory.push(ev);
  setStatus(`Played ${san}`, 'success');
  renderBoard();
  updateSidebar();
  await getSuggestions();
  checkGameOver();

  if (engineMode && !pyodide.globals.get('_is_game_over')()) {
    await doEngineMove();
  }
}

async function doEngineMove() {
  thinking = true;
  document.getElementById('thinkingBar').classList.add('active');
  const depth = parseInt(document.getElementById('depthSlider').value);
  await new Promise(r => setTimeout(r, 30));
  try {
    const uci = pyodide.globals.get('_get_engine_move')(depth);
    if (!uci) { thinking = false; document.getElementById('thinkingBar').classList.remove('active'); return; }
    const from = algebraicToSq(uci.slice(0,2));
    const to = algebraicToSq(uci.slice(2,4));
    const san = pyodide.globals.get('_make_move')(from, to);
    if (san) {
      moveHistory.push(san);
      const ev = pyodide.globals.get('_get_eval')();
      evalHistory.push(ev);
      setStatus(`Engine played ${san}`, 'success');
    }
  } finally {
    thinking = false;
    document.getElementById('thinkingBar').classList.remove('active');
    renderBoard();
    updateSidebar();
    await getSuggestions();
    checkGameOver();
  }
}

async function getSuggestions() {
  if (pyodide.globals.get('_is_game_over')()) return;
  const depth = Math.min(parseInt(document.getElementById('depthSlider').value), 3);
  const json = pyodide.globals.get('_get_suggestions')(depth, 3);
  const sugs = JSON.parse(json);
  const medals = ['🥇','🥈','🥉'];
  const body = document.getElementById('suggestBody');
  if (sugs.length === 0) { body.innerHTML = '<tr><td colspan="3" style="color:#666;font-style:italic;padding:8px 6px">No legal moves</td></tr>'; return; }
  body.innerHTML = sugs.map((s,i) => `<tr><td><span class="medal">${medals[i]||i+1}</span></td><td>${s.san}</td><td style="color:#e2b96a">${s.score_display}</td></tr>`).join('');
}

function checkGameOver() {
  if (pyodide.globals.get('_is_game_over')()) {
    const result = pyodide.globals.get('_result')();
    setStatus('🏆 ' + result, 'warn');
  }
}

function updateSidebar() {
  const ev = evalHistory[evalHistory.length - 1] || 0;
  const clamped = Math.max(-1000, Math.min(1000, ev));
  const whitePct = (clamped + 1000) / 2000 * 100;
  document.getElementById('evalBar').style.width = whitePct + '%';
  const dispEval = (ev / 100).toFixed(2);
  document.getElementById('evalLabel').textContent = (ev >= 0 ? '+' : '') + dispEval;

  const stackLen = pyodide.globals.get('_move_stack_len')();
  document.getElementById('mMove').textContent = Math.floor(stackLen / 2) + 1;
  document.getElementById('mPhase').textContent = pyodide.globals.get('_get_game_phase_py')();
  const mat = pyodide.globals.get('_material')().toJs();
  const diff = mat[0] - mat[1];
  document.getElementById('mMaterial').textContent = diff > 0 ? `White +${diff}` : diff < 0 ? `Black +${Math.abs(diff)}` : 'Equal';
  document.getElementById('mTurn').textContent = pyodide.globals.get('_turn')() === 'white' ? '⬜ White' : '⬛ Black';

  const hist = document.getElementById('historyList');
  if (moveHistory.length === 0) { hist.innerHTML = '<span style="color:#666;font-style:italic;font-size:0.85rem">No moves yet</span>'; return; }
  let html = '';
  for (let i = 0; i < moveHistory.length; i += 2) {
    html += `<div class="pair-row"><span class="pair-num">${i/2+1}.</span><span class="pair-w">${moveHistory[i]}</span><span class="pair-b">${moveHistory[i+1]||''}</span></div>`;
  }
  hist.innerHTML = html;
  hist.scrollTop = hist.scrollHeight;
}

async function newGame() {
  if (thinking) return;
  pyodide.globals.get('_new_game')();
  selectedSq = null; legalTargets = []; lastFrom = -1; lastTo = -1;
  moveHistory = []; evalHistory = [0];
  setStatus('♟ New game started!', 'success');
  renderBoard(); updateSidebar();
  document.getElementById('suggestBody').innerHTML = '<tr><td colspan="3" style="color:#666;font-style:italic;padding:8px 6px">Make a move to see suggestions</td></tr>';
}

async function undoMove() {
  if (thinking) return;
  const ok = pyodide.globals.get('_undo')();
  if (ok) {
    if (moveHistory.length) moveHistory.pop();
    if (evalHistory.length > 1) evalHistory.pop();
    selectedSq = null; legalTargets = [];
    setStatus('Move undone.', 'info');
    renderBoard(); updateSidebar();
  }
}

function toggleEngineMode() {
  engineMode = !engineMode;
  const btn = document.getElementById('engineBtn');
  btn.textContent = engineMode ? '🤖 Engine: ON' : '🤖 Engine: OFF';
  btn.style.background = engineMode ? '#1a4a1a' : '#5a1a1a';
  setStatus(engineMode ? '🤖 Engine mode ON — it plays Black' : '🤖 Engine mode OFF', 'info');
}

// ── Helpers ─────────────────────────────────────────────────────────────
function sqName(sq) {
  return 'abcdefgh'[sq % 8] + (Math.floor(sq / 8) + 1);
}
function algebraicToSq(alg) {
  return 'abcdefgh'.indexOf(alg[0]) + parseInt(alg[1]) * 8 - 8;
}
function setStatus(msg, type) {
  const el = document.getElementById('statusBar');
  el.textContent = msg;
  el.className = 'status-bar ' + (type || 'info');
}
function setLoading(msg) {
  document.getElementById('loadingMsg').textContent = msg;
}

// ── Start ────────────────────────────────────────────────────────────────
boot().catch(err => {
  setLoading('Error: ' + err.message);
  console.error(err);
});
</script>
</body>
</html>
