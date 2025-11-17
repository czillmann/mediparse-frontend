// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Token refresh promise to prevent multiple simultaneous refresh requests
let refreshPromise = null;

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
 * Decodes a JWT token to get its payload
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload
 */
const decodeToken = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Checks if a token is expired or will expire soon (within 5 minutes)
 * @param {string} token - JWT token
 * @returns {boolean} True if token is expired or expiring soon
 */
const isTokenExpired = (token) => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.exp - now;

  // Consider token expired if it expires in less than 5 minutes
  return expiresIn < 300;
};

/**
 * Refreshes the authentication tokens using the refresh token
 * @returns {Promise<boolean>} True if refresh was successful
 */
const refreshAuthToken = async () => {
  // If a refresh is already in progress, return that promise
  if (refreshPromise) {
    return refreshPromise;
  }

  try {
    const authData = localStorage.getItem('mediparse_auth');
    if (!authData) {
      return false;
    }

    const parsed = JSON.parse(authData);
    if (!parsed.refreshToken) {
      return false;
    }

    // Start the refresh request
    refreshPromise = fetch(`${API_BASE_URL}/api/users/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: parsed.refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Token refresh failed');
        }
        return response.json();
      })
      .then((data) => {
        // Update stored tokens
        const updatedAuth = {
          ...parsed,
          accessToken: data.accessToken,
          idToken: data.idToken,
        };
        localStorage.setItem('mediparse_auth', JSON.stringify(updatedAuth));
        return true;
      })
      .catch((error) => {
        console.error('Error refreshing token:', error);
        // Clear auth data on refresh failure
        localStorage.removeItem('mediparse_auth');
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });

    return await refreshPromise;
  } catch (error) {
    console.error('Error in refreshAuthToken:', error);
    refreshPromise = null;
    return false;
  }
};

/**
 * Creates headers with authentication token
 * Automatically refreshes token if expired
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Promise<Object>} Headers object
 */
const getAuthHeaders = async (additionalHeaders = {}) => {
  let token = getAuthToken();

  // Check if token is expired or expiring soon
  if (token && isTokenExpired(token)) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      token = getAuthToken();
    } else {
      // Token refresh failed, redirect to login
      window.location.href = '/';
      throw new Error('Session abgelaufen. Bitte melden Sie sich erneut an.');
    }
  }

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
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/contract-files`, {
      method: 'GET',
      headers: headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/contract-files/${id}`, {
      method: 'GET',
      headers: headers,
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
 * Approves the precheck and starts extraction
 * @param {string} id - File ID
 * @returns {Promise<Object>} Updated contract file
 */
export const approvePrecheck = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/contract-files/${id}/approve-precheck`, {
      method: 'POST',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Fehler beim Freigeben der Extraktion (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Resets extraction by deleting all positions and prices
 * @param {string} id - File ID
 * @returns {Promise<Object>} Updated contract file
 */
export const resetExtraction = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/contract-files/${id}/reset-extraction`, {
      method: 'POST',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Fehler beim Zurücksetzen der Extraktion (Status: ${response.status})`);
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/contract-files/${id}`, {
      method: 'DELETE',
      headers: headers,
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
    const headers = await getAuthHeaders({
      'Content-Type': 'application/json',
    });
    const response = await fetch(`${API_BASE_URL}/api/contract-files/${id}/status`, {
      method: 'PATCH',
      headers: headers,
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
 * Updates the OCR status of a contract file
 * @param {string} id - File ID
 * @param {string} ocrStatus - New OCR status (OCR_REQUIRED, OCR_DONE, etc.)
 * @returns {Promise<Object>} Updated file details
 */
/**
 * Updates a contract file (relationships)
 * @param {string} id - File ID
 * @param {Object} updates - Object with healthInsuranceId, serviceProviderIds, guildIds
 * @returns {Promise<Object>} Updated file details
 */
export const updateContractFile = async (id, updates) => {
  try {
    const headers = await getAuthHeaders({
      'Content-Type': 'application/json',
    });
    const response = await fetch(`${API_BASE_URL}/api/contract-files/${id}`, {
      method: 'PATCH',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Aktualisieren des Vertrags (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const updateContractFileOcrStatus = async (id, ocrStatus) => {
  try {
    const headers = await getAuthHeaders({
      'Content-Type': 'application/json',
    });
    const response = await fetch(`${API_BASE_URL}/api/contract-files/${id}/ocr-status`, {
      method: 'PATCH',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify({ ocrStatus }),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Aktualisieren des OCR Status (Status: ${response.status})`);
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/contract-files/${id}/download`, {
      method: 'GET',
      headers: headers,
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

/**
 * Creates a new health insurance company
 * @param {Object} healthInsurance - Health insurance data
 * @param {string} healthInsurance.name - Name of the health insurance
 * @param {Object} healthInsurance.address - Address object
 * @returns {Promise<Object>} Created health insurance
 */
export const createHealthInsurance = async (healthInsurance) => {
  try {
    const headers = await getAuthHeaders({
      'Content-Type': 'application/json',
    });
    const response = await fetch(`${API_BASE_URL}/api/health-insurances`, {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify(healthInsurance),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Fehler beim Anlegen der Krankenkasse (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Gets all health insurances for the current company
 * @returns {Promise<Array>} List of health insurances
 */
export const getHealthInsurances = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/health-insurances`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Krankenkassen (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Gets a specific health insurance by ID
 * @param {string} id - Health insurance ID
 * @returns {Promise<Object>} Health insurance details
 */
export const getHealthInsurance = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/health-insurances/${id}`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Krankenkasse (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Updates an existing health insurance
 * @param {string} id - Health insurance ID
 * @param {Object} healthInsurance - Updated health insurance data
 * @returns {Promise<Object>} Updated health insurance
 */
export const updateHealthInsurance = async (id, healthInsurance) => {
  try {
    const headers = await getAuthHeaders({
      'Content-Type': 'application/json',
    });
    const response = await fetch(`${API_BASE_URL}/api/health-insurances/${id}`, {
      method: 'PUT',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify(healthInsurance),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Fehler beim Aktualisieren der Krankenkasse (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Deletes a health insurance
 * @param {string} id - Health insurance ID
 * @returns {Promise<void>}
 */
export const deleteHealthInsurance = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/health-insurances/${id}`, {
      method: 'DELETE',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Fehler beim Löschen der Krankenkasse (Status: ${response.status})`);
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Creates a new service provider
 * @param {Object} serviceProvider - Service provider data
 * @returns {Promise<Object>} Created service provider
 */
export const createServiceProvider = async (serviceProvider) => {
  try {
    const headers = await getAuthHeaders({
      'Content-Type': 'application/json',
    });
    const response = await fetch(`${API_BASE_URL}/api/service-providers`, {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify(serviceProvider),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Fehler beim Anlegen des Leistungserbringers (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Gets all service providers for the current company
 * @returns {Promise<Array>} List of service providers
 */
export const getServiceProviders = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/service-providers`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Leistungserbringer (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Gets a specific service provider by ID
 * @param {string} id - Service provider ID
 * @returns {Promise<Object>} Service provider details
 */
export const getServiceProvider = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/service-providers/${id}`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Laden des Leistungserbringers (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Updates an existing service provider
 * @param {string} id - Service provider ID
 * @param {Object} serviceProvider - Updated service provider data
 * @returns {Promise<Object>} Updated service provider
 */
export const updateServiceProvider = async (id, serviceProvider) => {
  try {
    const headers = await getAuthHeaders({
      'Content-Type': 'application/json',
    });
    const response = await fetch(`${API_BASE_URL}/api/service-providers/${id}`, {
      method: 'PUT',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify(serviceProvider),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Fehler beim Aktualisieren des Leistungserbringers (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Deletes a service provider
 * @param {string} id - Service provider ID
 * @returns {Promise<void>}
 */
export const deleteServiceProvider = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/service-providers/${id}`, {
      method: 'DELETE',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Fehler beim Löschen des Leistungserbringers (Status: ${response.status})`);
    }
  } catch (error) {
    throw error;
  }
};

// ==================== Guild (Innung) API ====================

/**
 * Creates a new guild
 * @param {Object} guild - Guild data (name, address)
 * @returns {Promise<Object>} Created guild
 */
export const createGuild = async (guild) => {
  try {
    const headers = await getAuthHeaders({
      'Content-Type': 'application/json',
    });
    const response = await fetch(`${API_BASE_URL}/api/guilds`, {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify(guild),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Fehler beim Erstellen der Innung (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Gets all guilds for the current company
 * @returns {Promise<Array>} List of guilds
 */
export const getGuilds = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/guilds`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Innungen (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Gets a specific guild by ID
 * @param {string} id - Guild ID
 * @returns {Promise<Object>} Guild data
 */
export const getGuild = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/guilds/${id}`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Fehler beim Laden der Innung (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Updates an existing guild
 * @param {string} id - Guild ID
 * @param {Object} guild - Updated guild data
 * @returns {Promise<Object>} Updated guild
 */
export const updateGuild = async (id, guild) => {
  try {
    const headers = await getAuthHeaders({
      'Content-Type': 'application/json',
    });
    const response = await fetch(`${API_BASE_URL}/api/guilds/${id}`, {
      method: 'PUT',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify(guild),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Fehler beim Aktualisieren der Innung (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Deletes a guild
 * @param {string} id - Guild ID
 * @returns {Promise<void>}
 */
export const deleteGuild = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/guilds/${id}`, {
      method: 'DELETE',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Fehler beim Löschen der Innung (Status: ${response.status})`);
    }
  } catch (error) {
    throw error;
  }
};

// ==================== Contract Price API ====================

/**
 * Gets all contract prices for a specific contract file
 * @param {string} contractFileId - Contract file ID
 * @returns {Promise<Array>} List of contract prices
 */
export const getContractPrices = async (contractFileId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/contract-prices?contractFileId=${contractFileId}`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Vertragspreise (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

// ==================== Contract Position API ====================

/**
 * Gets all contract positions with prices for a specific contract file
 * @param {string} contractFileId - Contract file ID
 * @returns {Promise<Array>} List of contract positions with their prices
 */
export const getContractPositions = async (contractFileId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/contract-positions?contractFileId=${contractFileId}`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Vertragspositionen (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

// ==================== User Management API ====================

/**
 * Gets all users for the current company
 * @returns {Promise<Array>} List of users
 */
export const getUsers = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Benutzer (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Invites a new user to the company
 * @param {Object} invitation - Invitation data
 * @param {string} invitation.email - Email of the user to invite
 * @param {string} invitation.temporaryPassword - Temporary password for the new user
 * @returns {Promise<Object>} Created user
 */
export const inviteUser = async (invitation) => {
  try {
    const headers = await getAuthHeaders({
      'Content-Type': 'application/json',
    });
    const response = await fetch(`${API_BASE_URL}/api/users/invite`, {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify(invitation),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Fehler beim Einladen des Benutzers (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Deletes a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const deleteUser = async (userId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'DELETE',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Fehler beim Löschen des Benutzers (Status: ${response.status})`);
    }
  } catch (error) {
    throw error;
  }
};

// ==================== Extraction Rules API ====================

/**
 * Gets the extraction rules for a contract file
 * @param {string} contractFileId - Contract file ID
 * @returns {Promise<Object|null>} Extraction rules or null if not configured
 */
export const getExtractionRules = async (contractFileId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/contract-files/${contractFileId}/extraction-rules`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Extraction Rules (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Updates the extraction rules for a contract file
 * @param {string} contractFileId - Contract file ID
 * @param {Object} extractionRules - TableExtractionRules object
 * @returns {Promise<Object>} Updated contract file
 */
export const updateExtractionRules = async (contractFileId, extractionRules) => {
  try {
    const headers = await getAuthHeaders({
      'Content-Type': 'application/json',
    });
    const response = await fetch(`${API_BASE_URL}/api/contract-files/${contractFileId}/extraction-rules`, {
      method: 'PUT',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify(extractionRules),
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
    }

    if (!response.ok) {
      throw new Error(`Fehler beim Aktualisieren der Extraction Rules (Status: ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};
