import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <!-- Header Section -->
      <header class="page-header">
        <div class="header-content">
          <h1>Mis Pedidos</h1>
          <p>Pedidos y órdenes de tu empresa</p>
        </div>
        <button class="btn-primary"><i class="fa-solid fa-plus"></i> Nuevo Pedido</button>
      </header>

      <!-- Main Content Card -->
      <div class="content-card">
        <!-- Toolbar -->
        <div class="card-toolbar">
          <div class="search-box">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input type="text" class="search-input" placeholder="Buscar pedido..." />
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state">
          <div class="empty-icon">
            <i class="fa-solid fa-box"></i>
          </div>
          <p class="empty-text">No hay pedidos registrados</p>
        </div>
      </div>
    </div>
  `,
  styles: `
    .page-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-content h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 4px 0;
    }

    .header-content p {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }

    .btn-primary {
      background: #1b193b; /* Dark purple from the sidebar */
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
    }

    .btn-primary:hover {
      background: #2d2a5c;
    }

    /* Content Card */
    .content-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(0, 0, 0, 0.05);
      min-height: 400px;
      display: flex;
      flex-direction: column;
    }

    /* Toolbar */
    .card-toolbar {
      padding: 16px;
      border-bottom: 1px solid #f1f5f9;
    }

    .search-box {
      position: relative;
      width: 300px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 14px;
    }

    .search-input {
      width: 100%;
      padding: 10px 14px 10px 36px;
      border: none;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: background 0.2s;
      box-sizing: border-box;
    }

    .search-input:focus {
      background: #f1f5f9;
    }

    /* Empty State */
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 16px;
    }

    .empty-icon {
      font-size: 56px;
      color: #cbd5e1;
    }

    .empty-text {
      color: #64748b;
      font-size: 15px;
      margin: 0;
    }
  `,
})
export class OrdersListComponent {}
