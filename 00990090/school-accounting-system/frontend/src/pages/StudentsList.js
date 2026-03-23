// Students List Page
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { studentAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function StudentsList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    admission_number: '',
    first_name: '',
    last_name: '',
    email: '',
    parent_phone: '',
    parent_email: '',
    class_id: 1,
    section_id: 1
  });

  const { data: response, loading, error } = useFetch(
    () => studentAPI.getAll(page, 10, { search: search || undefined }),
    [page, search]
  );

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await studentAPI.create(formData);
      toast.success('Student added successfully!');
      setShowForm(false);
      setFormData({
        admission_number: '',
        first_name: '',
        last_name: '',
        email: '',
        parent_phone: '',
        parent_email: '',
        class_id: 1,
        section_id: 1
      });
      // Refresh list
      setPage(1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error adding student');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await studentAPI.delete(id);
        toast.success('Student deleted successfully!');
        setPage(1);
      } catch (error) {
        toast.error('Error deleting student');
      }
    }
  };

  if (loading) return <div className="spinner"></div>;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Students Management</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Add Student'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAddStudent} className="form-surface">
            <div className="section-grid tight">
              <div className="form-group">
                <label>Admission Number</label>
                <input
                  type="text"
                  value={formData.admission_number}
                  onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Parent Email</label>
                <input
                  type="email"
                  value={formData.parent_email}
                  onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Parent Phone</label>
                <input
                  type="tel"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success mt-15">
              Save Student
            </button>
          </form>
        )}

        <div className="mb-20">
          <input
            type="text"
            placeholder="Search by name or admission number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="search-input"
          />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <table className="table">
          <thead>
            <tr>
              <th>Admission #</th>
              <th>Name</th>
              <th>Email</th>
              <th>Parent Contact</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {response?.data?.map(student => (
              <tr key={student.id}>
                <td><strong>{student.admission_number}</strong></td>
                <td>{student.first_name} {student.last_name}</td>
                <td>{student.email || '-'}</td>
                <td>{student.parent_phone}</td>
                <td>
                  <span className="badge badge-success">
                    {student.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-primary btn-sm mr-5"
                    onClick={() => navigate(`/students/${student.id}`)}
                  >
                    View
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteStudent(student.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            ← Previous
          </button>
          <span className="pagination-label">Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!response?.data?.length}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
