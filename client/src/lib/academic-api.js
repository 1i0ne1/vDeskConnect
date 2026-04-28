import { api } from '@/lib/api';

/**
 * Academic API Service Layer
 * Handles all API calls for Phase 1 (Sessions, Terms, CA Weeks, Grade Scales)
 * and Phase 2 (Grade Levels, Sections, Departments, Subjects, Mappings)
 */

export const academicApi = {
  // Sessions
  sessions: {
    getAll: () => api.get('/academic/sessions'),
    create: (data) => api.post('/academic/sessions', data),
    update: (id, data) => api.put(`/academic/sessions/${id}`, data),
    delete: (id) => api.delete(`/academic/sessions/${id}`),
    setActive: (id) => api.put(`/academic/sessions/${id}/set-active`),
  },

  // Terms
  terms: {
    getAll: (sessionId) => api.get(`/academic/terms/session/${sessionId}`),
    getActive: () => api.get('/academic/terms'),
    create: (data) => api.post('/academic/terms', data),
    bulkCreate: (data) => api.post('/academic/terms/bulk', data),
    update: (id, data) => api.put(`/academic/terms/${id}`, data),
    delete: (id) => api.delete(`/academic/terms/${id}`),
  },

  // CA Weeks
  caWeeks: {
    getAll: (termId, gradeLevelId, subjectId) =>
      api.get(`/academic/ca-weeks/term/${termId}/grade/${gradeLevelId}/subject/${subjectId}`),
    getSummary: (termId, gradeLevelId, subjectId) =>
      api.get(`/academic/ca-weeks/term/${termId}/grade/${gradeLevelId}/subject/${subjectId}/summary`),
    set: (data) => api.post('/academic/ca-weeks', data),
    delete: (termId, gradeLevelId, subjectId) => api.delete(`/academic/ca-weeks/term/${termId}/grade/${gradeLevelId}/subject/${subjectId}`),
  },

  // Grade Scales
  gradeScales: {
    getAll: () => api.get('/academic/grade-scales'),
    create: (data) => api.post('/academic/grade-scales', data),
    update: (id, data) => api.put(`/academic/grade-scales/${id}`, data),
    setDefault: (id) => api.put(`/academic/grade-scales/${id}/set-default`),
    delete: (id) => api.delete(`/academic/grade-scales/${id}`),
    getTemplates: () => api.get('/academic/grade-scales/templates'),
  },

  // ==================== PHASE 2 ====================

  // Grade Levels
  gradeLevels: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.search) params.append('search', filters.search);
      if (filters.cycle) params.append('cycle', filters.cycle);
      return api.get(`/academic/grade-levels?${params.toString()}`);
    },
    create: (data) => api.post('/academic/grade-levels', data),
    update: (id, data) => api.put(`/academic/grade-levels/${id}`, data),
    delete: (id) => api.delete(`/academic/grade-levels/${id}`),
    bulkCreate: (data) => api.post('/academic/grade-levels/bulk', data),
  },

  // Sections
  sections: {
    getAll: (gradeLevelId) => api.get(`/academic/grade-levels/${gradeLevelId}/sections`),
    create: (data) => api.post('/academic/sections', data),
    update: (id, data) => api.put(`/academic/sections/${id}`, data),
    delete: (id) => api.delete(`/academic/sections/${id}`),
  },

  // Departments
  departments: {
    getAll: () => api.get('/academic/departments'),
    create: (data) => api.post('/academic/departments', data),
    update: (id, data) => api.put(`/academic/departments/${id}`, data),
    delete: (id) => api.delete(`/academic/departments/${id}`),
  },

  // Subjects
  subjects: {
    getAll: () => api.get('/academic/subjects'),
    create: (data) => api.post('/academic/subjects', data),
    update: (id, data) => api.put(`/academic/subjects/${id}`, data),
    delete: (id) => api.delete(`/academic/subjects/${id}`),
  },

  // Subject-to-Grade Mappings
  mappings: {
    getForGrade: (gradeLevelId) => api.get(`/academic/grade-levels/${gradeLevelId}/subjects`),
    assign: (data) => api.post('/academic/subject-mappings', data),
    bulkAssign: (data) => api.post('/academic/subject-mappings/bulk', data),
    remove: (id) => api.delete(`/academic/subject-mappings/${id}`),
  },

  // Teacher Assignments (Phase 4)
  gradeLevelDetail: (id) => api.get(`/academic/grade-levels/${id}`),
  teachers: {
    getAll: () => api.get('/academic/teachers'),
  },
  teacherAssignments: {
    assign: (data) => api.post('/academic/teacher-assignments', data),
    remove: (id) => api.delete(`/academic/teacher-assignments/${id}`),
  },

  // ==================== PHASE 5: SCHEME OF WORK ====================

  // Schemes of Work
  schemes: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.grade_level_id) params.append('grade_level_id', filters.grade_level_id);
      if (filters.subject_id) params.append('subject_id', filters.subject_id);
      if (filters.term_id) params.append('term_id', filters.term_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page);
      return api.get(`/academic/schemes?${params.toString()}`);
    },
    create: (data) => api.post('/academic/schemes', data),
    update: (id, data) => api.put(`/academic/schemes/${id}`, data),
    delete: (id) => api.delete(`/academic/schemes/${id}`),
    publish: (id) => api.put(`/academic/schemes/${id}/publish`),
    bulkCreate: (data) => api.post('/academic/schemes/bulk-create', data),
  },

  // AI Scheme Generator
  aiScheme: {
    generate: (data) => api.post('/ai/scheme-of-work', data),
  },

  // ==================== PHASE 6: LESSON NOTES ====================

  // Lesson Notes
  lessonNotes: {
    getAll: (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.search) params.append('search', filters.search);
      if (filters.teacher_id) params.append('teacher_id', filters.teacher_id);
      if (filters.grade_level_id) params.append('grade_level_id', filters.grade_level_id);
      if (filters.subject_id) params.append('subject_id', filters.subject_id);
      if (filters.term_id) params.append('term_id', filters.term_id);
      if (filters.status) params.append('status', filters.status);
      return api.get(`/academic/lesson-notes?${params.toString()}`);
    },
    create: (data) => api.post('/academic/lesson-notes', data),
    update: (id, data) => api.put(`/academic/lesson-notes/${id}`, data),
    delete: (id) => api.delete(`/academic/lesson-notes/${id}`),
    publish: (id) => api.put(`/academic/lesson-notes/${id}/publish`),
  },

  // AI Lesson Note Generator
  aiLessonNote: {
    generate: (data) => api.post('/ai/lesson-note', data),
  },

  // AI Lecture Generator
  aiLecture: {
    generate: (data) => api.post('/ai/lecture', data),
  },

  // ==================== PHASE 7: LECTURES ====================

  // Lectures
  lectures: {
    getAll: (filters) => api.get('/lectures', filters),
    getOne: (id) => api.get(`/lectures/${id}`),
    create: (data) => api.post('/lectures', data),
    update: (id, data) => api.put(`/lectures/${id}`, data),
    delete: (id) => api.delete(`/lectures/${id}`),
    start: (id) => api.put(`/lectures/${id}/start`),
    complete: (id) => api.put(`/lectures/${id}/complete`),
    cancel: (id) => api.put(`/lectures/${id}/cancel`),
    publish: (id) => api.put(`/lectures/${id}/publish`),
  },

  // Lecture Resources
  lectureResources: {
    getAll: (lectureId) => api.get(`/lectures/${lectureId}/resources`),
    add: (lectureId, data) => api.post(`/lectures/${lectureId}/resources`, data),
    upload: (lectureId, file, title, type, orderIndex, contentId = null, isDownloadable = false, isSavable = false, onProgress = null) => {
      return new Promise((resolve, reject) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
        const chunkSize = 1024 * 1024; // 1MB chunks
        const totalChunks = Math.ceil(file.size / chunkSize);
        const identifier = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;

        const uploadChunk = async (chunkIndex) => {
          try {
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            const formData = new FormData();
            formData.append('file', chunk);
            formData.append('chunk_index', chunkIndex);
            formData.append('total_chunks', totalChunks);
            formData.append('identifier', identifier);

            if (chunkIndex === totalChunks - 1) {
              formData.append('title', title || file.name);
              formData.append('type', type);
              if (orderIndex !== undefined && orderIndex !== null) formData.append('order_index', orderIndex);
              if (contentId !== null && contentId !== '' && contentId !== 'all') formData.append('content_id', contentId);
              formData.append('is_downloadable', isDownloadable ? '1' : '0');
              formData.append('is_savable', isSavable ? '1' : '0');
            }

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/lectures/${lectureId}/resources/upload`, true);
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            xhr.setRequestHeader('Accept', 'application/json');

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable && onProgress) {
                const chunkProgress = event.loaded / event.total;
                const overallProgress = Math.round(((chunkIndex + chunkProgress) / totalChunks) * 100);
                onProgress(Math.min(overallProgress, 100));
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                const response = JSON.parse(xhr.responseText);
                if (chunkIndex === totalChunks - 1) {
                  resolve(response);
                } else {
                  uploadChunk(chunkIndex + 1);
                }
              } else {
                let errorMsg = 'Upload failed';
                try {
                  const errData = JSON.parse(xhr.responseText);
                  errorMsg = errData.message || errorMsg;
                } catch (e) {}
                if (xhr.status === 413) errorMsg = 'File chunk is too large. Please contact support.';
                reject(new Error(errorMsg));
              }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(formData);
          } catch (err) {
            reject(err);
          }
        };

        uploadChunk(0);
      });
    },
    delete: (resourceId) => api.delete(`/lectures/resources/${resourceId}`),
  },

  // Lecture Attendance
  lectureAttendance: {
    getAll: (lectureId) => api.get(`/lectures/${lectureId}/attendance`),
    mark: (lectureId, data) => api.post(`/lectures/${lectureId}/attendance`, data),
  },

  // School Settings
  school: {
    getConfig: () => api.get('/academic/config'),
    updateConfig: (data) => api.put('/academic/config', data),
  },
};

export default academicApi;
