import { api } from './api';

export const examsApi = {
  // List exams with filters
  getExams: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/exams${query ? `?${query}` : ''}`;
    return await api.get(endpoint);
  },

  // Create a new exam header
  createExam: async (examData) => {
    return await api.post('/exams', examData);
  },

  // Get exam details with questions
  getExam: async (id) => {
    return await api.get(`/exams/${id}`);
  },

  // Update exam details
  updateExam: async (id, examData) => {
    return await api.put(`/exams/${id}`, examData);
  },

  // Delete an exam
  deleteExam: async (id) => {
    return await api.delete(`/exams/${id}`);
  },

  // Publish an exam
  publishExam: async (id) => {
    return await api.put(`/exams/${id}/publish`);
  },

  // Sync questions for an exam
  syncQuestions: async (id, questions) => {
    return await api.post(`/exams/${id}/questions`, { questions });
  },

  // List student submissions for an exam
  getSubmissions: async (examId) => {
    return await api.get(`/exams/${examId}/submissions`);
  },

  // Get detailed submission data (including answers)
  getSubmissionDetails: async (submissionId) => {
    return await api.get(`/exams/submissions/${submissionId}`);
  },

  // Grade a submission
  gradeSubmission: async (submissionId, answers) => {
    return await api.post(`/exams/submissions/${submissionId}/grade`, { answers });
  },

  // AI Exam Generator
  generateExamAI: async (config) => {
    return await api.post('/ai/exam', config);
  }
};
