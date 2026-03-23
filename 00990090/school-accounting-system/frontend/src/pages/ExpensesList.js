// Expenses Page
import React, { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { expenseAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ExpensesList() {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    category: 'Supplies',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });

  const { data: response, loading } = useFetch(() => expenseAPI.getAll(page, 10), [page]);
  const { data: categoriesResponse } = useFetch(() => expenseAPI.getCategories());

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await expenseAPI.create(formData);
      toast.success('Expense recorded!');
      setShowForm(false);
      setFormData({
        description: '',
        category: 'Supplies',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: ''
      });
      setPage(1);
    } catch (error) {
      toast.error('Error recording expense');
    }
  };

  if (loading) return <div className="spinner"></div>;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Expenses</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Add Expense'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAddExpense} className="form-surface">
            <div className="section-grid tight">
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categoriesResponse?.data?.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="Salaries">Salaries</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Utilities">Utilities</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success mt-15">
              Save Expense
            </button>
          </form>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {response?.data?.map(expense => (
              <tr key={expense.id}>
                <td>{expense.description}</td>
                <td>{expense.category}</td>
                <td className="text-danger">${expense.amount.toFixed(2)}</td>
                <td>{new Date(expense.expense_date).toLocaleDateString()}</td>
                <td>
                  <span className={`badge ${expense.is_approved ? 'badge-success' : 'badge-warning'}`}>
                    {expense.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <button onClick={() => setPage(page - 1)} disabled={page === 1}>← Previous</button>
          <span className="pagination-label">Page {page}</span>
          <button onClick={() => setPage(page + 1)} disabled={!response?.data?.length}>Next →</button>
        </div>
      </div>
    </div>
  );
}
