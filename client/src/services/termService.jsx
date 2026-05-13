import api from './api';

const getTerms = () => api.get('/terms');
const createTerm = (data) => api.post('/terms', data);
const updateTerm = (id, data) => api.put(`/terms/${id}`, data);
const deleteTerm = (id) => api.delete(`/terms/${id}`);

const termService = {
    getTerms,
    createTerm,
    updateTerm,
    deleteTerm
};

export default termService;
