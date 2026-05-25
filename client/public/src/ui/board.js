/**
 * Board Renderer - Kanban Board Layout
 * 
 * Renders and manages the Kanban board layout.
 * Pure vanilla DOM manipulation, responsive design.
 */

import Card from './card.js';

class Board {
  constructor(boardData, columns, tasks, handlers = {}) {
    this.boardData = boardData;
    this.columns = columns;
    this.tasks = tasks;
    this.handlers = handlers;
    this.element = null;
    this.cardInstances = new Map();
    this.render();
  }

  /**
   * Render board element
   */
  render() {
    const board = document.createElement('div');
    board.className = 'board';
    board.id = `board-${this.boardData.id}`;
    board.dataset.boardId = this.boardData.id;

    // Render each column
    for (const column of this.columns) {
      const columnEl = this.renderColumn(column);
      board.appendChild(columnEl);
    }

    // Add new column button
    const addColumnBtn = document.createElement('div');
    addColumnBtn.className = 'column add-column-btn';
    addColumnBtn.innerHTML = '<button class="btn-add-column">+ Add Column</button>';

    if (this.handlers.onAddColumn) {
      addColumnBtn.querySelector('button').addEventListener('click', () => {
        this.handlers.onAddColumn();
      });
    }

    board.appendChild(addColumnBtn);

    this.element = board;
    return this.element;
  }

  /**
   * Render single column
   */
  renderColumn(column) {
    const columnEl = document.createElement('div');
    columnEl.className = 'column';
    columnEl.id = `column-${column.id}`;
    columnEl.dataset.columnId = column.id;

    // Column header
    const header = document.createElement('div');
    header.className = 'column-header';

    const title = document.createElement('h3');
    title.className = 'column-title';
    title.textContent = column.title;
    header.appendChild(title);

    const count = document.createElement('span');
    count.className = 'column-count';
    const columnTasks = this.tasks.filter(t => t.columnId === column.id);
    count.textContent = columnTasks.length;
    header.appendChild(count);

    columnEl.appendChild(header);

    // Tasks container
    const tasksContainer = document.createElement('div');
    tasksContainer.className = 'tasks-container';
    tasksContainer.dataset.columnId = column.id;

    for (const task of columnTasks) {
      const card = new Card(task, {
        onClick: (data) => {
          if (this.handlers.onCardClick) {
            this.handlers.onCardClick(data);
          }
        },
        onMenu: (data) => {
          if (this.handlers.onCardMenu) {
            this.handlers.onCardMenu(data);
          }
        }
      });

      this.cardInstances.set(task.id, card);
      tasksContainer.appendChild(card.getElement());
    }

    // Add card button
    const addCardBtn = document.createElement('button');
    addCardBtn.className = 'btn-add-card';
    addCardBtn.textContent = '+ Add Card';
    addCardBtn.addEventListener('click', () => {
      if (this.handlers.onAddCard) {
        this.handlers.onAddCard(column.id);
      }
    });
    tasksContainer.appendChild(addCardBtn);

    columnEl.appendChild(tasksContainer);

    return columnEl;
  }

  /**
   * Update card in display
   */
  updateCard(taskId, newData) {
    const card = this.cardInstances.get(taskId);
    if (card) {
      card.update(newData);
    }
  }

  /**
   * Add card to display
   */
  addCard(task) {
    const columnEl = this.element.querySelector(`[data-column-id="${task.columnId}"]`);
    if (!columnEl) return;

    const tasksContainer = columnEl.querySelector('.tasks-container');
    const card = new Card(task, {
      onClick: (data) => this.handlers.onCardClick?.(data),
      onMenu: (data) => this.handlers.onCardMenu?.(data)
    });

    this.cardInstances.set(task.id, card);

    // Insert before add button
    const addBtn = tasksContainer.querySelector('.btn-add-card');
    tasksContainer.insertBefore(card.getElement(), addBtn);

    // Update count
    const count = columnEl.querySelector('.column-count');
    count.textContent = parseInt(count.textContent) + 1;
  }

  /**
   * Remove card from display
   */
  removeCard(taskId) {
    const card = this.cardInstances.get(taskId);
    if (card) {
      const element = card.getElement();
      const columnEl = element.closest('[data-column-id]');

      card.remove();
      this.cardInstances.delete(taskId);

      // Update count
      if (columnEl) {
        const count = columnEl.querySelector('.column-count');
        count.textContent = Math.max(0, parseInt(count.textContent) - 1);
      }
    }
  }

  /**
   * Move card to different column/position
   */
  moveCard(taskId, toColumnId, toPosition) {
    const card = this.cardInstances.get(taskId);
    if (!card) return;

    const element = card.getElement();
    const targetColumn = this.element.querySelector(`[data-column-id="${toColumnId}"]`);
    if (!targetColumn) return;

    // Update counts
    const fromColumn = element.closest('[data-column-id]');
    if (fromColumn) {
      const count = fromColumn.querySelector('.column-count');
      count.textContent = Math.max(0, parseInt(count.textContent) - 1);
    }

    const toCount = targetColumn.querySelector('.column-count');
    toCount.textContent = parseInt(toCount.textContent) + 1;

    // Move element
    const tasksContainer = targetColumn.querySelector('.tasks-container');
    const cards = Array.from(tasksContainer.querySelectorAll('[data-card-id]'));
    const addBtn = tasksContainer.querySelector('.btn-add-card');

    if (toPosition < cards.length) {
      tasksContainer.insertBefore(element, cards[toPosition]);
    } else {
      tasksContainer.insertBefore(element, addBtn);
    }
  }

  /**
   * Get DOM element
   */
  getElement() {
    return this.element;
  }

  /**
   * Clear board
   */
  clear() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.cardInstances.clear();
  }
}

export default Board;
