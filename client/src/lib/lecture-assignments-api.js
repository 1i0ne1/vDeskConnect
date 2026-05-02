import { api } from './api';

export const lectureAssignmentsApi = {
  // List assignments for a lecture
  getAssignments: async (lectureId) => {
    return await api.get(`/lectures/${lectureId}/assignments`);
  },

  // Get single assignment details
  getAssignment: async (assignmentId) => {
    return await api.get(`/lectures/assignments/${assignmentId}`);
  },

  // Create assignment
  createAssignment: async (lectureId, data) => {
    return await api.post(`/lectures/${lectureId}/assignments`, data);
  },

  // Update assignment
  updateAssignment: async (assignmentId, data) => {
    return await api.put(`/lectures/assignments/${assignmentId}`, data);
  },

  // Delete assignment
  deleteAssignment: async (assignmentId) => {
    return await api.delete(`/lectures/assignments/${assignmentId}`);
  },

  // Publish assignment
  publishAssignment: async (assignmentId) => {
    return await api.put(`/lectures/assignments/${assignmentId}/publish`);
  },

  // Close assignment
  closeAssignment: async (assignmentId) => {
    return await api.put(`/lectures/assignments/${assignmentId}/close`);
  },

  // Questions
  getQuestions: async (assignmentId) => {
    return await api.get(`/lectures/assignments/${assignmentId}/questions`);
  },

  addQuestion: async (assignmentId, data) => {
    return await api.post(`/lectures/assignments/${assignmentId}/questions`, data);
  },

  updateQuestion: async (assignmentId, questionId, data) => {
    return await api.put(`/lectures/assignments/${assignmentId}/questions/${questionId}`, data);
  },

  deleteQuestion: async (assignmentId, questionId) => {
    return await api.delete(`/lectures/assignments/${assignmentId}/questions/${questionId}`);
  },

  syncQuestions: async (assignmentId, questions) => {
    return await api.post(`/lectures/assignments/${assignmentId}/questions/sync`, { questions });
  },

  // Submissions
  getSubmissions: async (assignmentId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await api.get(`/lectures/assignments/${assignmentId}/submissions${query ? `?${query}` : ''}`);
  },

  getMySubmission: async (assignmentId) => {
    return await api.get(`/lectures/assignments/${assignmentId}/submission`);
  },

  getSubmissionDetails: async (submissionId) => {
    return await api.get(`/lectures/submissions/${submissionId}`);
  },

  submitAssignment: async (assignmentId, answers) => {
    return await api.post(`/lectures/assignments/${assignmentId}/submit`, { answers });
  },

  gradeSubmission: async (submissionId, score, feedback) => {
    return await api.put(`/lectures/submissions/${submissionId}/grade`, { score, feedback });
  },

  autoGrade: async (assignmentId) => {
    return await api.post(`/lectures/assignments/${assignmentId}/auto-grade`);
  },

  // Lecture completion check
  checkMandatoryAssignments: async (lectureId) => {
    return await api.get(`/lectures/${lectureId}/check-completion`);
  },
};

export const caWeightConfigApi = {
  // List CA weight configs
  getConfigs: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await api.get(`/academic/ca-weight-config${query ? `?${query}` : ''}`);
  },

  // Create/update CA weight config
  saveConfig: async (data) => {
    return await api.post('/academic/ca-weight-config', data);
  },

  // Update CA weight config
  updateConfig: async (id, data) => {
    return await api.put(`/academic/ca-weight-config/${id}`, data);
  },

  // Delete CA weight config
  deleteConfig: async (id) => {
    return await api.delete(`/academic/ca-weight-config/${id}`);
  },
};
