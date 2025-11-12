// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * Gets the authentication token from localStorage
 * @returns {string|null} ID token (contains email) or null if not found
 */
const getAuthToken = () => {
  try {
    const authData = localStorage.getItem('mediparse_auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      // Use ID token instead of access token - ID token contains email claim
      return parsed.idToken || parsed.accessToken;
    }
  } catch (error) {
    console.error('Error reading auth token:', error);
  }
  return null;
};

/**
 * Creates headers with authentication token
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Object} Headers object
 */
const getAuthHeaders = (additionalHeaders = {}) => {
  const token = getAuthToken();
  const headers = {
    ...additionalHeaders
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Registers a new user with company and Cognito account
 * @param {Object} userData - User registration data
 * @param {string} userData.companyName - Company name
 * @param {string} userData.email - User email address
 * @param {string} userData.password - User password
 * @returns {Promise<Object>} Registration response
 */
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registrierung fehlgeschlagen');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Checks if a user exists by email
 * @param {string} email - User email address
 * @returns {Promise<boolean>} True if user exists
 */
export const checkUserExists = async (email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/exists?email=${encodeURIComponent(email)}`);
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
};

/**
 * Authenticates a user with AWS Cognito via backend
 * @param {string} email - User email address
 * @param {string} password - User password
 * @returns {Promise<Object>} Login response with tokens and user info
 */
export const loginUser = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Anmeldung fehlgeschlagen');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Uploads a contract file (PDF) to the backend
 * @param {File} file - PDF file to upload
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<Object>} Upload response with file metadata
 */
export const uploadContractFile = async (file, onProgress) => {
  // Validate file type
  if (file.type !== 'application/pdf') {
    throw new Error('Nur PDF-Dateien sind erlaubt');
  }

  // Validate file size (10 MB)
  const maxSize = 10 * 1024 * 1024; // 10 MB in bytes
  if (file.size > maxSize) {
    throw new Error('Datei ist zu groß. Maximale Größe: 10 MB');
  }

  // Check if user is authenticated
  const token = getAuthToken();
  if (!token) {
    throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
  }

  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error('Ungültige Server-Antwort'));
        }
      } else if (xhr.status === 401 || xhr.status === 403) {
        reject(new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.'));
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.error || errorData.message || `Upload fehlgeschlagen (Status: ${xhr.status})`));
        } catch (error) {
          reject(new Error(`Upload fehlgeschlagen (Status: ${xhr.status})`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Netzwerkfehler beim Upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload abgebrochen'));
    });

    xhr.open('POST', `${API_BASE_URL}/api/contract-files/upload`);
    xhr.withCredentials = true;
    // Add Authorization header with Bearer token
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
};

/**
 * Gets all contract files for the current user's company
 * @returns {Promise<Array>} List of contract files
 */
export const getContractFiles = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/contract-files`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Dateien (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Gets details of a specific contract file
 * @param {string} id - File ID
 * @returns {Promise<Object>} Contract file details
 */
export const getContractFile = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/contract-files/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Datei (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Deletes a contract file
 * @param {string} id - File ID
 * @returns {Promise<void>}
 */
export const deleteContractFile = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/contract-files/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Löschen der Datei (Status: ${response.status})`);
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Updates the status of a contract file
 * @param {string} id - File ID
 * @param {string} status - New status (UPLOADED, PROCESSING, PROCESSED, FAILED)
 * @returns {Promise<Object>} Updated file details
 */
export const updateContractFileStatus = async (id, status) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/contract-files/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify({ status }),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Aktualisieren des Status (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Downloads a contract file
 * @param {string} id - File ID
 * @param {string} fileName - File name for download
 * @returns {Promise<void>}
 */
export const downloadContractFile = async (id, fileName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/contract-files/${id}/download`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Herunterladen der Datei (Status: ${response.status})`);
    }

    // Get the blob from response
    const blob = await response.blob();

    // Create a temporary URL for the blob
    const url = window.URL.createObjectURL(blob);

    // Create a temporary anchor element and trigger download
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    throw error;
  }
};
