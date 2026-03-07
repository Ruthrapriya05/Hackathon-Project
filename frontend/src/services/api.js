import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('certchain_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Certificate APIs
export const issueCertificate = (data) =>
  api.post('/certificates/issue', data);

export const bulkIssueCertificates = (formData) =>
  api.post('/certificates/bulk-issue', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // 2min for bulk ops
  });

export const revokeCertificate = (certificateId, reason) =>
  api.post('/certificates/revoke', { certificateId, reason });

export const getCertificate = (id) =>
  api.get(`/certificates/${id}`);

export const getStudentCertificates = (address) =>
  api.get(`/certificates/student/${address}`);

export const getIssuerCertificates = (address) =>
  api.get(`/certificates/issuer/${address}`);

export const getCertificateStats = () =>
  api.get('/certificates/stats/overview');

// Verification APIs
export const verifyCertificate = (id) =>
  api.get(`/verify/${id}`);

export const getQRCode = (id) =>
  api.get(`/verify/${id}/qr`);

export const verifyHash = (certificateId, hash) =>
  api.post('/verify/hash', { certificateId, hash });

// IPFS APIs
export const uploadToIPFS = (data) =>
  api.post('/ipfs/upload', { data });

export const fetchFromIPFS = (cid) =>
  api.get(`/ipfs/${cid}`);

// Health check
export const healthCheck = () =>
  api.get('/health');

export default api;
