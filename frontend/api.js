// api.js — ES module for PerformIQ AI API communication.
// Demonstrates: ES6 modules (export), Fetch API, async/await, Promises, Error handling.

const BASE_URL = '/api/students';

/**
 * Helper to handle fetch responses and error extraction.
 * Parses error messages from the server (including validation error arrays).
 */
async function handleResponse(response) {
  if (response.status === 204) {
    return null; // No Content (DELETE success)
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    if (data) {
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        message = data.errors.join('; ');
      } else if (data.error) {
        message = data.error;
      }
    }
    const error = new Error(message);
    error.status = response.status;
    error.errors = data?.errors || [];
    throw error;
  }

  return data;
}

/**
 * Fetch all student records.
 * @returns {Promise<Array>} List of student objects.
 */
export async function getStudents() {
  try {
    const res = await fetch(BASE_URL);
    return await handleResponse(res);
  } catch (err) {
    if (err.status) throw err;
    throw new Error('Unable to reach server. Please ensure the backend is running.');
  }
}

/**
 * Fetch a single student record by ID.
 * @param {number|string} id
 * @returns {Promise<Object>} Student object.
 */
export async function getStudent(id) {
  try {
    const res = await fetch(`${BASE_URL}/${id}`);
    return await handleResponse(res);
  } catch (err) {
    if (err.status) throw err;
    throw new Error('Unable to reach server. Please ensure the backend is running.');
  }
}

/**
 * Create a new student record.
 * @param {Object} student
 * @returns {Promise<Object>} Newly created student.
 */
export async function createStudent(student) {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    return await handleResponse(res);
  } catch (err) {
    if (err.status) throw err;
    throw new Error('Unable to reach server. Please ensure the backend is running.');
  }
}

/**
 * Update an existing student record.
 * @param {number|string} id
 * @param {Object} student
 * @returns {Promise<Object>} Updated student.
 */
export async function updateStudent(id, student) {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    return await handleResponse(res);
  } catch (err) {
    if (err.status) throw err;
    throw new Error('Unable to reach server. Please ensure the backend is running.');
  }
}

/**
 * Delete a student record by ID.
 * @param {number|string} id
 * @returns {Promise<null>}
 */
export async function deleteStudent(id) {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    });
    return await handleResponse(res);
  } catch (err) {
    if (err.status) throw err;
    throw new Error('Unable to reach server. Please ensure the backend is running.');
  }
}
