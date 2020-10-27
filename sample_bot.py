#!/usr/bin/env python
import time
import random
import sys


ALPHABET = 'ABCDEFGH'


def xy2i(x, y):
    return y * 8 + x


def i2xy(i):
    return (i % 8, i // 8)


def ab2i(ab):
    return xy2i(ALPHABET.index(ab[0].upper()), int(ab[1]) - 1)


def i2ab(i):
    x, y = i2xy(i)
    return ALPHABET[x] + str(y + 1)


class Tile:
    none = 0
    black = 1
    white = 2
    blackhole = 3

    @classmethod
    def opposite(self, cl):
        if cl == self.black:
            return self.white
        elif cl == self.white:
            return self.black
        else:
            raise ValueError()


class GameState:
    directions = [(1, 0), (1, 1), (0, 1), (-1, 1),
                  (-1, 0), (-1, -1), (0, -1), (1, -1)]

    def __init__(self, color, black_hole):
        board = [Tile.none for _ in range(64)]
        board[xy2i(3, 3)] = board[xy2i(4, 4)] = Tile.white
        board[xy2i(4, 3)] = board[xy2i(3, 4)] = Tile.black
        self.board = board
        self.color = Tile.black if color == 'black' else Tile.white
        self.black_hole = ab2i(black_hole)
        self.logfile = open('bot.log', 'w')
        self.boardlog = open('board.log', 'w')

    def get_allowed_moves(self, opposite=False):
        color1 = Tile.opposite(self.color) if opposite else self.color
        color2 = Tile.opposite(color1)
        allowed_moves = dict()

        for index, tile in enumerate(self.board):
            if tile != color1:
                continue
            x, y = i2xy(index)
            for dx, dy in GameState.directions:
                row2flip = []
                _x, _y = x + dx, y + dy
                while _x >= 0 and _x < 8 and _y >= 0 and _y < 8:
                    idx = xy2i(_x, _y)
                    c = self.board[idx]
                    if c == color2:
                        row2flip.append(idx)
                    elif c == Tile.none:
                        if row2flip and idx != self.black_hole:
                            allowed_moves[idx] = row2flip + \
                                allowed_moves.get(idx, [])
                        break
                    else:
                        break
                    _x += dx
                    _y += dy
        return allowed_moves

    def step(self):
        allowed_moves = self.get_allowed_moves()
        random_move = random.choice(list(allowed_moves.keys()))
        print(i2ab(random_move))
        self.logfile.write('my move: ' + i2ab(random_move) + '\n')
        self.board[random_move] = self.color
        to_be_flipped = allowed_moves[random_move]
        for i in to_be_flipped:
            self.board[i] = self.color

        other_color = Tile.white if self.color == Tile.black else Tile.black
        other_move = input()
        self.logfile.write('his move: ' + other_move + '\n')

        allowed_moves = self.get_allowed_moves(opposite=True)
        other_move_index = ab2i(other_move)
        self.board[other_move_index] = other_color
        to_be_flipped = allowed_moves[other_move_index]
        for i in to_be_flipped:
            self.board[i] = other_color

        self.boardlog.write(self.repr_board() + '\n\n')

    def run(self):
        try:
            while True:
                self.step()
                time.sleep(1)
        except Exception as e:
            self.logfile.write('\n' + repr(e))

    def repr_board(self):
        row_i = 0
        ans = [[]]
        for i in range(64):
            t = self.board[i]
            if t == Tile.none:
                ans[-1].append('-')
            elif t == Tile.black:
                ans[-1].append('B')
            elif t == Tile.white:
                ans[-1].append('W')
            else:
                ans[-1].append('X')
            row_i += 1
            if row_i == 8:
                ans.append([])
                row_i = 0
        return '\n'.join(''.join(ch for ch in row) for row in ans)


if __name__ == '__main__':
    time.sleep(1)
    blackhole = input()
    color = input()
    GameState(color, blackhole).run()
