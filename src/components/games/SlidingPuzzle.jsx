import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Games.css';
import { RotateCcw, Trophy, Clock, Footprints } from 'lucide-react';

export default function SlidingPuzzle({ onComplete }) {
  const [size, setSize] = useState(3); // 3 for 3x3 (8-puzzle), 4 for 4x4 (15-puzzle)
  const [tiles, setTiles] = useState([]);
  const [moves, setMoves] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const timerRef = useRef(null);

  // Generate a guaranteed-solvable board by starting from solved state and making random legal moves
  const generateSolvableBoard = useCallback((gridSize) => {
    const totalTiles = gridSize * gridSize;
    const board = Array.from({ length: totalTiles - 1 }, (_, i) => i + 1);
    board.push(null); // empty space

    let emptyIndex = totalTiles - 1;
    let lastMoved = null;
    const shuffleMovesCount = gridSize === 3 ? 40 : 80;

    for (let step = 0; step < shuffleMovesCount; step++) {
      const neighbors = [];
      const row = Math.floor(emptyIndex / gridSize);
      const col = emptyIndex % gridSize;

      if (row > 0) neighbors.push(emptyIndex - gridSize); // up
      if (row < gridSize - 1) neighbors.push(emptyIndex + gridSize); // down
      if (col > 0) neighbors.push(emptyIndex - 1); // left
      if (col < gridSize - 1) neighbors.push(emptyIndex + 1); // right

      // Avoid immediate backtracking if possible
      const validNeighbors = neighbors.filter(n => n !== lastMoved);
      const chosenNeighbor = validNeighbors.length > 0 
        ? validNeighbors[Math.floor(Math.random() * validNeighbors.length)]
        : neighbors[Math.floor(Math.random() * neighbors.length)];

      board[emptyIndex] = board[chosenNeighbor];
      board[chosenNeighbor] = null;
      lastMoved = emptyIndex;
      emptyIndex = chosenNeighbor;
    }

    // Safety check: if by chance it's already solved, swap two random adjacent valid tiles
    let alreadySolved = true;
    for (let i = 0; i < totalTiles - 1; i++) {
      if (board[i] !== i + 1) {
        alreadySolved = false;
        break;
      }
    }
    if (alreadySolved) {
      const row = Math.floor(emptyIndex / gridSize);
      const neighbor = row > 0 ? emptyIndex - gridSize : emptyIndex + gridSize;
      board[emptyIndex] = board[neighbor];
      board[neighbor] = null;
    }

    return board;
  }, []);

  const initGame = useCallback((gridSize = size) => {
    clearInterval(timerRef.current);
    const newBoard = generateSolvableBoard(gridSize);
    setTiles(newBoard);
    setMoves(0);
    setElapsedTime(0);
    setIsSolved(false);
    setHasStarted(false);
  }, [size, generateSolvableBoard]);

  useEffect(() => {
    initGame(size);
    return () => clearInterval(timerRef.current);
  }, [size, initGame]);

  // Timer logic
  useEffect(() => {
    if (hasStarted && !isSolved) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [hasStarted, isSolved]);

  const checkWin = (board) => {
    const totalTiles = size * size;
    for (let i = 0; i < totalTiles - 1; i++) {
      if (board[i] !== i + 1) return false;
    }
    return board[totalTiles - 1] === null;
  };

  const moveTile = (index) => {
    if (isSolved || tiles[index] === null) return;

    const emptyIndex = tiles.indexOf(null);
    const row = Math.floor(index / size);
    const col = index % size;
    const emptyRow = Math.floor(emptyIndex / size);
    const emptyCol = emptyIndex % size;

    // Check adjacency
    const isAdjacent = (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
                       (Math.abs(col - emptyCol) === 1 && row === emptyRow);

    if (!isAdjacent) return;

    if (!hasStarted) {
      setHasStarted(true);
    }

    const newTiles = [...tiles];
    newTiles[emptyIndex] = newTiles[index];
    newTiles[index] = null;
    setTiles(newTiles);
    setMoves(m => m + 1);

    if (checkWin(newTiles)) {
      setIsSolved(true);
      clearInterval(timerRef.current);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 800);
    }
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSolved) return;
      const emptyIndex = tiles.indexOf(null);
      if (emptyIndex === -1) return;

      const emptyRow = Math.floor(emptyIndex / size);
      const emptyCol = emptyIndex % size;
      let targetIndex = -1;

      if (e.key === 'ArrowUp' && emptyRow < size - 1) {
        // Tile below moves up into empty
        targetIndex = emptyIndex + size;
      } else if (e.key === 'ArrowDown' && emptyRow > 0) {
        // Tile above moves down into empty
        targetIndex = emptyIndex - size;
      } else if (e.key === 'ArrowLeft' && emptyCol < size - 1) {
        // Tile to the right moves left into empty
        targetIndex = emptyIndex + 1;
      } else if (e.key === 'ArrowRight' && emptyCol > 0) {
        // Tile to the left moves right into empty
        targetIndex = emptyIndex - 1;
      }

      if (targetIndex !== -1) {
        e.preventDefault();
        moveTile(targetIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="game-container sliding-puzzle-game">
      <div className="game-header">
        <h3>Sliding Number Puzzle</h3>
        <p>Arrange numbers in numerical order. Take your time — no pressure.</p>
        
        <div className="sliding-puzzle-controls">
          <div className="difficulty-toggle">
            <button 
              className={`toggle-pill ${size === 3 ? 'active' : ''}`}
              onClick={() => { setSize(3); initGame(3); }}
            >
              3x3 (Quick)
            </button>
            <button 
              className={`toggle-pill ${size === 4 ? 'active' : ''}`}
              onClick={() => { setSize(4); initGame(4); }}
            >
              4x4 (Classic 15)
            </button>
          </div>

          <button className="puzzle-reset-btn" onClick={() => initGame(size)} title="Shuffle Board">
            <RotateCcw size={15} /> Shuffle
          </button>
        </div>

        <div className="game-stats">
          <span className="stat-pill"><Footprints size={15} /> Moves: {moves}</span>
          <span className="stat-pill"><Clock size={15} /> Time: {formatTime(elapsedTime)}</span>
        </div>
      </div>

      <div 
        className="sliding-puzzle-grid"
        style={{
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          maxWidth: size === 3 ? '320px' : '380px'
        }}
      >
        {tiles.map((tile, index) => {
          const isCorrect = tile !== null && tile === index + 1;
          return (
            <div
              key={tile !== null ? tile : 'empty'}
              className={`sliding-tile ${tile === null ? 'empty-tile' : ''} ${isCorrect ? 'correct-position' : ''}`}
              onClick={() => moveTile(index)}
            >
              {tile !== null ? (
                <span className="tile-number">{tile}</span>
              ) : null}
            </div>
          );
        })}
      </div>

      {isSolved && (
        <div className="game-over puzzle-win-overlay">
          <div className="win-icon-wrapper">
            <Trophy size={40} className="win-trophy" />
          </div>
          <h4>Puzzle Solved!</h4>
          <p>Great focus! Solved in {moves} moves and {formatTime(elapsedTime)}.</p>
          <button className="game-start-btn mt-3" onClick={() => initGame(size)}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
