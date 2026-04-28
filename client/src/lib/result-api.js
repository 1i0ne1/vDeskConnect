import { api } from '@/lib/api';

export const resultApi = {
  grades: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.grade_level_id) params.append('grade_level_id', filters.grade_level_id);
      if (filters.subject_id) params.append('subject_id', filters.subject_id);
      if (filters.term_id) params.append('term_id', filters.term_id);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page);
      if (filters.per_page) params.append('per_page', filters.per_page);
      return api.get(`/results/grades?${params.toString()}`);
    },
    compute: (data) => api.post('/results/grades/compute', data),
    computeOverall: (data) => api.post('/results/overall/compute', data),
  },
  reports: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.grade_level_id) params.append('grade_level_id', filters.grade_level_id);
      if (filters.term_id) params.append('term_id', filters.term_id);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page);
      if (filters.per_page) params.append('per_page', filters.per_page);
      return api.get(`/results/report-cards?${params.toString()}`);
    },
    generate: (data) => api.post('/results/report-cards/generate', data),
  },
  pins: {
    getAll: () => api.get('/results/pins'),
    generate: (count) => api.post('/results/pins/generate', { count }),
  },
  check: (data) => api.post('/results/check', data),
};

export default resultApi;
