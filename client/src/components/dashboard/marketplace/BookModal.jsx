'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, BookOpen, Download, FileText, Package, AlertCircle } from 'lucide-react';
import marketplaceApi from '@/lib/marketplace-api';
import { academicApi } from '@/lib/academic-api';
import { useToast } from '@/contexts/ToastProvider';

export default function BookModal({ isOpen, onClose, onSaved, book, gradeLevels }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    grade_level_id: '',
    subject_id: '',
    price: '',
    is_electronic: true,
    file_url: '',
    physical_form_url: '',
    description: '',
    stock_count: '',
    available: true,
  });

  useEffect(() => {
    if (isOpen) {
      fetchSubjects();
      if (book) {
        setFormData({
          title: book.title || '',
          grade_level_id: book.grade_level_id || '',
          subject_id: book.subject_id || '',
          price: book.price || '',
          is_electronic: book.is_electronic ?? true,
          file_url: book.file_url || '',
          physical_form_url: book.physical_form_url || '',
          description: book.description || '',
          stock_count: book.stock_count || '',
          available: book.available ?? true,
        });
      } else {
        setFormData({
          title: '',
          grade_level_id: '',
          subject_id: '',
          price: '',
          is_electronic: true,
          file_url: '',
          physical_form_url: '',
          description: '',
          stock_count: '',
          available: true,
        });
      }
    }
  }, [isOpen, book]);

  const fetchSubjects = async () => {
    try {
      const res = await academicApi.subjects.getAll();
      setSubjects(res.subjects || res.data || []);
    } catch (error) {
      console.error('Failed to fetch subjects');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (book) {
        await marketplaceApi.updateBook(book.id, formData);
        toast.success('Book updated successfully');
      } else {
        await marketplaceApi.addBook(formData);
        toast.success('Book added to marketplace');
      }
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save book');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-bg-card w-full max-w-2xl rounded-card border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-main">{book ? 'Edit Textbook' : 'Add New Textbook'}</h2>
                  <p className="text-sm text-text-secondary">Fill in the details for the marketplace book</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-text-secondary transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-2">Book Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-main focus:outline-none focus:border-primary transition-all"
                    placeholder="e.g. Essential Mathematics for JSS 3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Grade Level</label>
                  <select
                    required
                    value={formData.grade_level_id}
                    onChange={(e) => setFormData({ ...formData, grade_level_id: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-main focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="">Select Grade</option>
                    {gradeLevels.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Subject (Optional)</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-main focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Price (₦)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-main focus:outline-none focus:border-primary transition-all font-mono"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Format</label>
                  <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_electronic: true })}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-bold transition-all ${formData.is_electronic ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-text-main'}`}
                    >
                      <Download size={16} />
                      <span>Electronic</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_electronic: false })}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-bold transition-all ${!formData.is_electronic ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-text-main'}`}
                    >
                      <Package size={16} />
                      <span>Physical</span>
                    </button>
                  </div>
                </div>

                {formData.is_electronic ? (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text-secondary mb-2">File Download URL</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                      <input
                        type="url"
                        value={formData.file_url}
                        onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-main focus:outline-none focus:border-primary transition-all"
                        placeholder="https://example.com/book.pdf"
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-text-secondary flex items-center space-x-1">
                      <AlertCircle size={10} />
                      <span>Students will receive this link instantly after successful payment.</span>
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-medium text-text-secondary mb-2">Reference Form URL</label>
                      <input
                        type="url"
                        value={formData.physical_form_url}
                        onChange={(e) => setFormData({ ...formData, physical_form_url: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-main focus:outline-none focus:border-primary transition-all"
                        placeholder="Link to collection form"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-medium text-text-secondary mb-2">Stock Count</label>
                      <input
                        type="number"
                        value={formData.stock_count}
                        onChange={(e) => setFormData({ ...formData, stock_count: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-main focus:outline-none focus:border-primary transition-all"
                        placeholder="Unlimited if empty"
                      />
                    </div>
                  </>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text-main focus:outline-none focus:border-primary transition-all resize-none"
                    placeholder="Describe the textbook content..."
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <div 
                      onClick={() => setFormData({ ...formData, available: !formData.available })}
                      className={`w-12 h-6 rounded-full transition-all relative ${formData.available ? 'bg-primary' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.available ? 'left-7' : 'left-1'}`} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-text-main">List for Sale</span>
                      <p className="text-xs text-text-secondary">If disabled, students won't see this book in the marketplace.</p>
                    </div>
                  </label>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-text-main font-bold hover:bg-white/5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center space-x-2 px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                <span>{book ? 'Update Book' : 'Add to Marketplace'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
