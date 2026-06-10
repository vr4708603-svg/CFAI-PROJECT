
import chess
import time

PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000,
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
    chess.PAWN:   PAWN_TABLE,
    chess.KNIGHT: KNIGHT_TABLE,
    chess.BISHOP: BISHOP_TABLE,
    chess.ROOK:   ROOK_TABLE,
    chess.QUEEN:  QUEEN_TABLE,
    chess.KING:   KING_MID_TABLE,
}


def is_endgame(board):
    queens = len(board.pieces(chess.QUEEN, chess.WHITE)) + len(board.pieces(chess.QUEEN, chess.BLACK))
    if queens == 0:
        return True
    minor_major = sum(
        len(board.pieces(pt, c))
        for pt in [chess.ROOK, chess.BISHOP, chess.KNIGHT]
        for c in [chess.WHITE, chess.BLACK]
    )
    return queens <= 2 and minor_major <= 4


def pst_index(square, color):
    rank = square // 8
    file = square % 8
    if color == chess.WHITE:
        return (7 - rank) * 8 + file
    else:
        return rank * 8 + file


def evaluate_board(board):
    if board.is_checkmate():
        return -99999 if board.turn == chess.WHITE else 99999
    if board.is_stalemate() or board.is_insufficient_material():
        return 0

    endgame = is_endgame(board)
    score = 0

    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if not piece:
            continue
        val = PIECE_VALUES[piece.piece_type]
        if endgame and piece.piece_type == chess.KING:
            pst = KING_END_TABLE[pst_index(square, piece.color)]
        else:
            pst = TABLES[piece.piece_type][pst_index(square, piece.color)]
        total = val + pst
        if piece.color == chess.WHITE:
            score += total
        else:
            score -= total

    cur = board.turn
    board.turn = chess.WHITE
    wm = len(list(board.legal_moves))
    board.turn = chess.BLACK
    bm = len(list(board.legal_moves))
    board.turn = cur
    score += (wm - bm) * 4

    for sq in chess.SQUARES:
        p = board.piece_at(sq)
        if p and p.piece_type == chess.PAWN:
            file = chess.square_file(sq)
            pawns_on_file = len([
                s for s in board.pieces(chess.PAWN, p.color)
                if chess.square_file(s) == file
            ])
            if pawns_on_file > 1:
                penalty = -15 * (pawns_on_file - 1)
                if p.color == chess.WHITE:
                    score += penalty
                else:
                    score -= penalty

    return score


def order_moves(board, moves):
    def move_score(move):
        sc = 0
        if board.is_capture(move):
            victim = board.piece_at(move.to_square)
            attacker = board.piece_at(move.from_square)
            if victim and attacker:
                sc += 10 * PIECE_VALUES.get(victim.piece_type, 0) - PIECE_VALUES.get(attacker.piece_type, 0)
        if move.promotion:
            sc += PIECE_VALUES.get(move.promotion, 0)
        if board.gives_check(move):
            sc += 80
        return sc

    return sorted(moves, key=move_score, reverse=True)


def minimax(board, depth, alpha, beta, maximizing):
    if depth == 0 or board.is_game_over():
        return evaluate_board(board)

    moves = order_moves(board, list(board.legal_moves))

    if maximizing:
        best = float('-inf')
        for move in moves:
            board.push(move)
            val = minimax(board, depth - 1, alpha, beta, False)
            board.pop()
            best = max(best, val)
            alpha = max(alpha, val)
            if beta <= alpha:
                break
        return best
    else:
        best = float('inf')
        for move in moves:
            board.push(move)
            val = minimax(board, depth - 1, alpha, beta, True)
            board.pop()
            best = min(best, val)
            beta = min(beta, val)
            if beta <= alpha:
                break
        return best


def get_best_moves(board, depth=4, num_moves=5):
    if board.is_game_over():
        return []

    moves = order_moves(board, list(board.legal_moves))
    is_white = board.turn == chess.WHITE
    results = []

    for move in moves:
        board.push(move)
        score = minimax(board, depth - 1, float('-inf'), float('inf'), not is_white)
        board.pop()
        san = board.san(move)
        results.append({
            'move': move,
            'uci': move.uci(),
            'san': san,
            'score': score,
            'score_pawns': score / 100.0,
            'score_display': format_score(score, board.turn),
        })

    results.sort(key=lambda x: x['score'], reverse=is_white)
    return results[:num_moves]


def format_score(score, turn):
    if abs(score) >= 9000:
        plies = 99999 - abs(score)
        moves_to_mate = plies // 2 + 1
        if score > 0:
            return f"M{moves_to_mate}" if turn == chess.WHITE else f"-M{moves_to_mate}"
        else:
            return f"-M{moves_to_mate}" if turn == chess.WHITE else f"M{moves_to_mate}"
    display = score / 100.0
    if turn == chess.BLACK:
        display = -display
    return f"{display:+.2f}"


def get_position_evaluation(board):
    return evaluate_board(board)


def get_game_phase(board):
    pieces = sum(
        len(board.pieces(pt, c))
        for pt in [chess.ROOK, chess.BISHOP, chess.KNIGHT, chess.QUEEN]
        for c in [chess.WHITE, chess.BLACK]
    )
    if pieces >= 12:
        return "Opening"
    elif pieces >= 6:
        return "Middlegame"
    else:
        return "Endgame"
