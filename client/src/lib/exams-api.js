import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Add a request interceptor to add the auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const examsApi = {
  // List exams with filters
  getExams: async (params = {}) => {
    const response = await api.get('/exams', { params });
    return response.data;
  },

  // Create a new exam header
  createExam: async (examData) => {
    const response = await api.post('/exams', examData);
    return response.data;
  },

  // Get exam details with questions
  getExam: async (id) => {
    const response = await api.get(`/exams/${id}`);
    return response.data;
  },

  // Update exam details
  updateExam: async (id, examData) => {
    const response = await api.put(`/exams/${id}`, examData);
    return response.data;
  },

  // Delete an exam
  deleteExam: async (id) => {
    const response = await api.delete(`/exams/${id}`);
    return response.data;
  },

  // Publish an exam
  publishExam: async (id) => {
    const response = await api.put(`/exams/${id}/publish`);
    return response.data;
  },

  // Sync questions for an exam
  syncQuestions: async (id, questions) => {
    const response = await api.post(`/exams/${id}/questions`, { questions });
    return response.data;
  },

  // List student submissions for an exam
  getSubmissions: async (examId) => {
    const response = await api.get(`/exams/${examId}/submissions`);
    return response.data;
  },

  // Get detailed submission data (including answers)
  getSubmissionDetails: async (submissionId) => {
    const response = await api.get(`/exams/submissions/${submissionId}`);
    return response.data;
  },

  // Grade a submission
  gradeSubmission: async (submissionId, answers) => {
    const response = await api.post(`/exams/submissions/${submissionId}/grade`, { answers });
    return response.data;
  },

  // AI Exam Generator
  generateExamAI: async (config) => {
    const response = await api.post('/ai/exam', config);
    return response.data;
  }
};
