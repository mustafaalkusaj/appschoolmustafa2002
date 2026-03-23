// Payments Page
import React, { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { paymentAPI, studentAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function PaymentsList() {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  });

  const { data: response, loading } = useFetch(
    () => paymentAPI.getAll(page, 10),
    [page]
  );

  const { data: studentsResponse } = useFetch(() => studentAPI.getAll(1, 100));

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      await paymentAPI.create(formData);
      toast.success('Payment recorded successfully!');
      setShowForm(false);
      setFormData({ student_id: '', amount: '', payment_method: 'cash', reference_number: '', notes: '' });
      setPage(1);
    } catch (error) {
      toast.error('Error recording payment');
    }
  };

  const handleDeletePayment = async (id) => {
    if (window.confirm('Delete this payment?')) {
      try {
        await paymentAPI.delete(id);
        toast.success('Payment deleted!');
        setPage(1);
      } catch (error) {
        toast.error('Error deleting payment');
      }
    }
  };

  if (loading) return <div className="spinner"></div>;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Payment Records</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Record Payment'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleRecordPayment} className="form-surface">
            <div className="section-grid tight">
              <div className="form-group">
                <label>Student</label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: parseInt(e.target.value) })}
                  required
                >
                  <option value="">Select Student</option>
                  {studentsResponse?.data?.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                    </option>
                  ))}
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
                <label>Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reference Number</label>
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success mt-15">
              Record Payment
            </button>
          </form>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Student</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {response?.data?.map(payment => (
              <tr key={payment.id}>
                <td><strong>{payment.receipt_number}</strong></td>
                <td>{payment.first_name} {payment.last_name}</td>
                <td className="text-success">${payment.amount.toFixed(2)}</td>
                <td>{payment.payment_method}</td>
                <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeletePayment(payment.id)}
                  >
                    Delete
                  </button>
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
