/**
 * Card Renderer - Individual Task Card UI
 * 
 * Renders and manages individual task card elements.
 * Pure vanilla DOM manipulation.
 */

class Card {
  constructor(taskData, handlers = {}) {
    this.data = taskData;
    this.handlers = handlers;
    this.element = null;
    this.render();
  }

  /**
   * Render card element
   */
  render() {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = `card-${this.data.id}`;
    card.dataset.cardId = this.data.id;
    card.draggable = true;

    card.innerHTML = `
      <div class="card-header">
        <h4 class="card-title">${this.escapeHtml(this.data.title)}</h4>
        <button class="card-menu-btn" title="Options">
          <span>⋮</span>
        </button>
      </div>
      
      ${this.data.description ? `
        <p class="card-description">
          ${this.escapeHtml(this.data.description)}
        </p>
      ` : ''}
      
      ${this.data.tags && this.data.tags.length > 0 ? `
        <div class="card-tags">
          ${this.data.tags.map(tag => `
            <span class="tag">${this.escapeHtml(tag)}</span>
          `).join('')}
        </div>
      ` : ''}
      
      ${this.data.assignee ? `
        <div class="card-assignee">
          <span class="assignee-label">Assigned to:</span>
          <span class="assignee-name">${this.escapeHtml(this.data.assignee)}</span>
        </div>
      ` : ''}
      
      <div class="card-footer">
        <small class="card-id">ID: ${this.data.id.substring(0, 8)}</small>
        <small class="card-date">Updated: ${this.formatDate(this.data.updatedAt)}</small>
      </div>
    `;

    // Event listeners
    const menuBtn = card.querySelector('.card-menu-btn');
    if (menuBtn && this.handlers.onMenu) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handlers.onMenu(this.data);
      });
    }

    card.addEventListener('click', () => {
      if (this.handlers.onClick) {
        this.handlers.onClick(this.data);
      }
    });

    this.element = card;
    return this.element;
  }

  /**
   * Update card data and re-render
   */
  update(newData) {
    this.data = newData;
    const newElement = this.render();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.replaceChild(newElement, this.element);
    }
    return this.element;
  }

  /**
   * Format date for display
   */
  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    // Less than 1 minute
    if (diff < 60000) {
      return 'just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }

    // Less than 1 day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }

    // Show date
    return date.toLocaleDateString();
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Get DOM element
   */
  getElement() {
    return this.element;
  }

  /**
   * Remove element
   */
  remove() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

export default Card;
