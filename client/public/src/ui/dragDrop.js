/**
 * Drag & Drop - Zero-Dependency Implementation
 * 
 * Pure vanilla JavaScript drag-and-drop without any libraries.
 * Uses HTML5 Drag & Drop API with custom visual feedback.
 */

class DragDropManager {
  constructor(boardContainer) {
    this.boardContainer = boardContainer;
    this.draggedElement = null;
    this.draggedData = null;
    this.placeholder = null;
    this.dropZones = new Map();

    this.initializeEventListeners();
  }

  /**
   * Initialize drag-drop event listeners
   */
  initializeEventListeners() {
    // Delegate drag events to board container
    this.boardContainer.addEventListener('dragstart', (e) => this.handleDragStart(e));
    this.boardContainer.addEventListener('dragend', (e) => this.handleDragEnd(e));
    this.boardContainer.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.boardContainer.addEventListener('dragenter', (e) => this.handleDragEnter(e));
    this.boardContainer.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.boardContainer.addEventListener('drop', (e) => this.handleDrop(e));
  }

  /**
   * Register a drop zone
   */
  registerDropZone(element, columnId) {
    this.dropZones.set(element, {columnId, cards: []});
  }

  /**
   * Handle drag start
   */
  handleDragStart(event) {
    const cardElement = event.target.closest('[data-card-id]');
    if (!cardElement) return;

    const cardId = cardElement.dataset.cardId;
    const columnId = cardElement.closest('[data-column-id]').dataset.columnId;

    this.draggedElement = cardElement;
    this.draggedData = {cardId, columnId};

    // Set drag image
    const dragImage = cardElement.cloneNode(true);
    dragImage.style.opacity = '0.7';
    dragImage.style.position = 'absolute';
    dragImage.style.left = '-9999px';
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', cardId);

    // Visual feedback
    cardElement.classList.add('dragging');
    cardElement.style.opacity = '0.5';

    console.log(`🚀 Dragging card: ${cardId}`);
  }

  /**
   * Handle drag over
   */
  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    return false;
  }

  /**
   * Handle drag enter
   */
  handleDragEnter(event) {
    const target = event.target.closest('[data-column-id]');
    if (!target || !this.draggedElement) return;

    target.classList.add('drag-over');

    // Show insertion point
    const cardElement = event.target.closest('[data-card-id]');
    if (cardElement && cardElement !== this.draggedElement) {
      this.showPlaceholder(cardElement);
    }
  }

  /**
   * Handle drag leave
   */
  handleDragLeave(event) {
    // Only remove if we're leaving the column entirely
    const target = event.target.closest('[data-column-id]');
    if (target && !target.contains(event.relatedTarget)) {
      target.classList.remove('drag-over');
      if (this.placeholder) {
        this.placeholder.remove();
        this.placeholder = null;
      }
    }
  }

  /**
   * Handle drop
   */
  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const targetColumn = event.target.closest('[data-column-id]');
    if (!targetColumn || !this.draggedData) return;

    const toColumnId = targetColumn.dataset.columnId;
    const cardElement = event.target.closest('[data-card-id]');
    let toPosition = 0;

    if (cardElement && cardElement !== this.draggedElement) {
      // Calculate position
      const cards = Array.from(targetColumn.querySelectorAll('[data-card-id]'));
      toPosition = cards.indexOf(cardElement);

      if (toPosition === -1) {
        toPosition = cards.length;
      }
    } else {
      // Add to end of column
      const cards = targetColumn.querySelectorAll('[data-card-id]');
      toPosition = cards.length;
    }

    // Emit drop event
    this.boardContainer.dispatchEvent(
      new CustomEvent('card-dropped', {
        detail: {
          cardId: this.draggedData.cardId,
          fromColumnId: this.draggedData.columnId,
          toColumnId,
          toPosition
        }
      })
    );

    targetColumn.classList.remove('drag-over');
    console.log(`✅ Dropped at column: ${toColumnId}, position: ${toPosition}`);
  }

  /**
   * Handle drag end
   */
  handleDragEnd(event) {
    if (this.draggedElement) {
      this.draggedElement.classList.remove('dragging');
      this.draggedElement.style.opacity = '';
    }

    // Clear drag data
    this.draggedElement = null;
    this.draggedData = null;

    // Remove placeholder
    if (this.placeholder) {
      this.placeholder.remove();
      this.placeholder = null;
    }

    // Remove drag-over from all columns
    this.boardContainer.querySelectorAll('[data-column-id]').forEach(col => {
      col.classList.remove('drag-over');
    });
  }

  /**
   * Show placeholder for insertion point
   */
  showPlaceholder(beforeElement) {
    if (this.placeholder) {
      this.placeholder.remove();
    }

    this.placeholder = document.createElement('div');
    this.placeholder.className = 'card-placeholder';
    this.placeholder.style.height = '4px';
    this.placeholder.style.margin = '8px 0';
    this.placeholder.style.backgroundColor = '#2563eb';
    this.placeholder.style.borderRadius = '2px';

    beforeElement.parentNode.insertBefore(this.placeholder, beforeElement);
  }
}

export default DragDropManager;
