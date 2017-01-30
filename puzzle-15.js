class Tile {
  constructor(number, ctx, size) {
    this.ctx = ctx;
    this.number = number;
    this.size = size;
  }

  draw(x, y) {
    this.x = x;
    this.y = y;

    this.ctx.fillStyle = "#E54B4B";
    this.ctx.fillRect(this.x, this.y, this.size, this.size);
    this.ctx.strokeStyle = "#FFF";
    this.ctx.strokeRect(this.x, this.y, this.size, this.size);

    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(this.number, this.x + this.size/2, this.y + this.size/2);
  }

  includeCoordinates(x, y) {
    // check if tile overlaps the given coordinates
    return this.x <= x && x <= this.x + this.size
      && this.y <= y && y <= this.y + this.size
  }

  move(newX, newY) {
    let dx = 8;
    let dy = 8;

    if (this.x > newX) {
      dx = -dx;
    }
    if (this.y > newY) {
      dy = -dy;
    }

    let timer;
    function animate() {
      let diffX = Math.floor(Math.abs(this.x - newX));
      let diffY = Math.floor(Math.abs(this.y - newY));

      if (diffX == 0 && diffY == 0) {
          cancelAnimationFrame(timer);
      } else {
        let nextPosX = this.x;
        let nextPosY = this.y;
        this.ctx.clearRect(this.x, this.y, this.size, this.size);
        if (diffX != 0) {
          if (diffX < Math.abs(dx)) {
            nextPosX = newX;
          } else {
            nextPosX = this.x + dx;
          }
        }
        if (diffY != 0) {
          if (diffY < Math.abs(dy)) {
            nextPosY = newY;
          } else {
            nextPosY = this.y + dy;
          }
        }
        this.draw(nextPosX, nextPosY);
        timer = requestAnimationFrame(animate.bind(this));
      }
    }

    timer = requestAnimationFrame(animate.bind(this));
  }
}

class Puzzle {

  constructor(size, canvas) {
    this.size = size;
    this.canvas = canvas;

    this.ctx = this.canvas.getContext('2d');
    this.ctx.font = '48px arial';

    this.directions = {
      u: {r: -1, c: 0},
      d: {r: 1, c: 0},
      l: {r: 0, c: -1},
      r: {r: 0, c: 1}
    }

    this.calculateDimensions();
    this.generateBoard();
    this.canvas.addEventListener('click', this.onCanvasClick.bind(this));
  }

  start() {
    this.draw();
  }

  scramble() {
    for(let i = 0; i < 100; i++) {
      let randomRow = Math.floor(Math.random() * this.size);
      let randomCol = Math.floor(Math.random() * this.size);
      this.move(randomRow, randomCol, this.directions, false);
    }
    this.draw();
  }

  draw() {
    for (let r=0; r < this.size; r++) {
      for (let c=0; c < this.size; c++) {
        let tile = this.board[r][c];
        let coords = this.getCoordinates(r, c);
        if (tile) {
          tile.draw(coords.x, coords.y);
        } else {
          this.ctx.clearRect(coords.x, coords.y, this.tileSize, this.tileSize);
        }
      }
    }
  }

  generateBoard() {
    this.board = new Array(this.size);
    let tileId = 1

    for (let r=0; r < this.size; r++) {
      for (let c=0; c < this.size; c++) {
        if (!this.board[r]) {
          this.board[r] = new Array(this.size);
        }

        // don't create a tile for the last board piece
        if (tileId != this.size*this.size) {
          this.board[r][c] = new Tile(tileId, this.ctx, this.tileSize);
          tileId++;
        }
      }
    }
  }

  // calculates the x, y coordinates for the given row and col
  getCoordinates(row, col) {
    return {
      x: col * this.tileSize,
      y: row * this.tileSize
    }
  }

  // the tile width
  calculateDimensions() {
    let width = this.canvas.width;

    this.tileSize = Math.floor(width / this.size);
  }

  onCanvasClick(event) {
    // x,y positions are not relative but absolute path in the body
    let x = event.pageX - this.canvas.parentElement.offsetLeft;
    let y = event.pageY - this.canvas.parentElement.offsetTop;

    let rowCol = this.rowColClickedOn(x, y);
    // if no row col, it means it's the empty box
    if (rowCol) {
      this.move(rowCol.row, rowCol.col);
    }
  }

  move(row, col, directions = this.directions, animate = true) {
    // check each directions to see if it's possible to move.
    // if the direction has occupying tile, then recursive check
    // the neighbor tile to see if we can move in same direction.
    // if neighbor has moved, then the direction we want to move
    // should be empty and we can move current tile there. if we
    // can't move in one direction, then
    // we move on and check the other direction

    for (var key in directions) {
      if (!directions.hasOwnProperty(key)) {
        continue;
      }
      let value = directions[key];

      // if not a valid move, check next direction
      if (!this.validMove(row, col, value)) {
        continue;
      }

      let neighborLoc = this.getNeighborTileLoc(row, col, value);
      if (!this.board[neighborLoc.row][neighborLoc.col]) {
        // move myself to neighbor
        this.moveToNeighbor(row, col, neighborLoc, animate);
        return;
      } else {
        // recursively check my tile neighbor see if they can move
        this.move(neighborLoc.row, neighborLoc.col, {key: value}, animate);

        // check again if neighbor is free since we attempted to move it before
        if (!this.board[neighborLoc.row][neighborLoc.col]) {
          // move myself to neighbor
          this.moveToNeighbor(row, col, neighborLoc, animate);
          return;
        }
      }
    }
  }

  // move the given tile on the board to it's the neighbor
  moveToNeighbor(row, col, neighborLoc, animate) {
    let coords = this.getCoordinates(neighborLoc.row, neighborLoc.col);
    if (animate) {
      this.board[row][col].move(coords.x, coords.y);
    }

    this.board[neighborLoc.row][neighborLoc.col] = this.board[row][col];
    this.board[row][col] = null;
  }

  validMove(row, col, direction) {
    let loc = this.getNeighborTileLoc(row, col, direction);

    // check if the move will not push tile out of the board
    return 0 <= loc.row && loc.row <= this.size - 1
      && 0 <= loc.col && loc.col <= this.size - 1
  }

  // generates the neighbor tile loc based on the given direction
  getNeighborTileLoc(row, col, direction) {
    return {row: row + direction.r, col: col + direction.c};
  }

  rowColClickedOn(x, y) {
    // finds the row and col that was clicked on
    for (let r=0; r < this.size; r++) {
      for (let c=0; c < this.size; c++) {
        let tile = this.board[r][c];
        if (tile && tile.includeCoordinates(x, y)) {
          return {row: r, col: c};
        }
      }
    }
  }
}
