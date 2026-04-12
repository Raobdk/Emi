import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { 
  UserPlus, Edit, Eye, Trash2, Search, Users, 
  Save, X, UserX 
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const CustomerModal = ({ customer, onClose, onSave }) => {
  const [form, setForm] = useState(customer || {
    name: '', cnic: '', phone: '', email: '',
    address: { street: '', city: '', country: 'Pakistan' },
    occupation: '', monthlyIncome: '',
    reference: { name: '', phone: '', relation: '' }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setForm(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title flex items-center gap-2">
            {customer ? <><Edit size={20} className="text-accent" /> Edit Customer</> : <><UserPlus size={20} className="text-accent" /> Add Customer</>}
          </h3>
          <button className="btn btn-sm btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Full Name *</label>
                <input name="name" value={form.name} onChange={handleChange} className="form-control" placeholder="Muhammad Ali" required />
              </div>
              <div className="form-group">
                <label className="form-label">CNIC *</label>
                <input name="cnic" value={form.cnic} onChange={handleChange} className="form-control" placeholder="XXXXX-XXXXXXX-X" required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input name="phone" value={form.phone} onChange={handleChange} className="form-control" placeholder="+92 300 0000000" required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input name="email" value={form.email} onChange={handleChange} className="form-control" placeholder="email@example.com" type="email" />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input name="address.city" value={form.address?.city} onChange={handleChange} className="form-control" placeholder="Lahore" />
              </div>
              <div className="form-group">
                <label className="form-label">Occupation</label>
                <input name="occupation" value={form.occupation} onChange={handleChange} className="form-control" placeholder="e.g. Teacher" />
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Income (PKR)</label>
                <input name="monthlyIncome" value={form.monthlyIncome} onChange={handleChange} className="form-control" type="number" placeholder="50000" />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Address</label>
                <input name="address.street" value={form.address?.street} onChange={handleChange} className="form-control" placeholder="Street address" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Guarantor / Reference</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Name</label>
                    <input name="reference.name" value={form.reference?.name} onChange={handleChange} className="form-control" placeholder="Ref Name" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Phone</label>
                    <input name="reference.phone" value={form.reference?.phone} onChange={handleChange} className="form-control" placeholder="Phone" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Relation</label>
                    <input name="reference.relation" value={form.reference?.relation} onChange={handleChange} className="form-control" placeholder="Brother" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <X size={16} /> Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {customer ? <><Save size={16} /> Save Changes</> : <><UserPlus size={16} /> Add Customer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | 'add' | customer object
  const navigate = useNavigate();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await customersAPI.getAll({ page, limit: 12, search });
      setCustomers(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on('customer_added', fetchCustomers);
    return () => socket.off('customer_added', fetchCustomers);
  }, [socket, fetchCustomers]);

  // Debounce search
  useEffect(() => { setPage(1); }, [search]);

  const handleSave = async (form) => {
    try {
      if (modal && modal._id) {
        await customersAPI.update(modal._id, form);
        toast.success('Customer updated!');
      } else {
        await customersAPI.create(form);
        toast.success('Customer added! 🎉');
      }
      setModal(null);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete customer "${name}"? This action cannot be undone.`)) return;
    try {
      await customersAPI.delete(id);
      toast.success('Customer deleted');
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete');
    }
  };

  const statusBadge = (s) => ({
    active: 'badge-success', inactive: 'badge-default', blacklisted: 'badge-danger'
  }[s] || 'badge-default');

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage all customer profiles</p>
        </div>
        <button className="btn btn-primary shadow-lg" onClick={() => setModal('add')}>
          <UserPlus size={18} /> Add Customer
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar" style={{ flex: 1, maxWidth: 360 }}>
            <Search size={18} className="text-muted" />
            <input
              placeholder="Search by name, CNIC, or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>}
          </div>
          <span className="badge badge-info">{pagination.total || 0} customers</span>
        </div>

        {loading ? <LoadingSpinner /> : (
          <>
            {customers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><UserX size={48} className="text-muted" /></div>
                <h3>No customers found</h3>
                <p>{search ? 'Try a different search term' : 'Add your first customer to get started'}</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Customer ID</th>
                      <th>Name</th>
                      <th>CNIC</th>
                      <th>Phone</th>
                      <th>City</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(c => (
                      <tr key={c._id}>
                        <td><code style={{ fontSize: 12, color: 'var(--accent)' }}>{c.customerId}</code></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: 'var(--accent-glow)',
                              color: 'var(--accent)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: 12, flexShrink: 0
                            }}>
                              {c.name[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{c.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email || c.occupation || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13, fontFamily: 'monospace' }}>{c.cnic}</td>
                        <td>{c.phone}</td>
                        <td>{c.address?.city || '-'}</td>
                        <td><span className={`badge ${statusBadge(c.status)}`}>{c.status}</span></td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-sm btn-secondary btn-icon" title="View" onClick={() => navigate(`/customers/${c._id}`)}><Eye size={16} /></button>
                            <button className="btn btn-sm btn-secondary btn-icon" title="Edit" onClick={() => setModal(c)}><Edit size={16} /></button>
                            <button className="btn btn-sm btn-danger btn-icon" title="Delete" onClick={() => handleDelete(c._id, c.name)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 20 }}>
                <button className="btn btn-sm btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
                <span style={{ padding: '6px 14px', color: 'var(--text-muted)', fontSize: 14 }}>
                  Page {page} of {pagination.pages}
                </span>
                <button className="btn btn-sm btn-secondary" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {modal && (
        <CustomerModal
          customer={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Customers;
