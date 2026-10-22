/* ==========================================================================
   MEDICO - VALIDATION & SANITIZATION RULES
   ========================================================================== */

const Validation = {
  /**
   * Validate Patient Registration Form Payload
   */
  validatePatient(patientData, existingPatients = []) {
    const errors = {};

    if (!patientData.name || patientData.name.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters.';
    }

    if (!patientData.id || !/^MED-\d{3,6}$/i.test(patientData.id.trim())) {
      errors.id = 'Patient ID must follow format MED-XXX (e.g., MED-101).';
    } else {
      // Check duplicate ID
      const duplicate = existingPatients.find(
        p => p.id.toUpperCase() === patientData.id.trim().toUpperCase() && p.id !== patientData.originalId
      );
      if (duplicate) {
        errors.id = 'This Patient ID is already registered in the system.';
      }
    }

    if (!patientData.dob) {
      errors.dob = 'Date of birth is required.';
    } else {
      const dobDate = new Date(patientData.dob);
      if (isNaN(dobDate.getTime()) || dobDate > new Date()) {
        errors.dob = 'Please enter a valid past birth date.';
      }
    }

    if (!patientData.room || patientData.room.trim().length === 0) {
      errors.room = 'Ward / Room location is required.';
    }

    if (!patientData.clinician || patientData.clinician.trim().length === 0) {
      errors.clinician = 'Assigned clinician is required.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Validate Clinical Observation Payload
   */
  validateObservation(obs) {
    const errors = [];

    if (!obs || typeof obs !== 'object') {
      return { isValid: false, errors: ['Invalid observation object structure.'] };
    }

    if (!obs.patientId) {
      errors.push('Missing patientId identifier.');
    }

    // Physiological bounds validation
    if (obs.heartRate !== null && obs.heartRate !== undefined) {
      if (typeof obs.heartRate !== 'number' || obs.heartRate < 20 || obs.heartRate > 260) {
        errors.push(`Heart rate ${obs.heartRate} is out of physiological bounds (20-260 bpm).`);
      }
    }

    if (obs.spo2 !== null && obs.spo2 !== undefined) {
      if (typeof obs.spo2 !== 'number' || obs.spo2 < 50 || obs.spo2 > 100) {
        errors.push(`Oxygen saturation ${obs.spo2}% is out of physiological bounds (50-100%).`);
      }
    }

    if (obs.bpSystolic !== null && obs.bpSystolic !== undefined) {
      if (typeof obs.bpSystolic !== 'number' || obs.bpSystolic < 40 || obs.bpSystolic > 260) {
        errors.push(`Systolic BP ${obs.bpSystolic} mmHg is out of bounds (40-260).`);
      }
    }

    if (obs.bpDiastolic !== null && obs.bpDiastolic !== undefined) {
      if (typeof obs.bpDiastolic !== 'number' || obs.bpDiastolic < 30 || obs.bpDiastolic > 160) {
        errors.push(`Diastolic BP ${obs.bpDiastolic} mmHg is out of bounds (30-160).`);
      }
    }

    if (obs.respiratoryRate !== null && obs.respiratoryRate !== undefined) {
      if (typeof obs.respiratoryRate !== 'number' || obs.respiratoryRate < 4 || obs.respiratoryRate > 60) {
        errors.push(`Respiratory rate ${obs.respiratoryRate} is out of bounds (4-60 /min).`);
      }
    }

    if (obs.temperature !== null && obs.temperature !== undefined) {
      if (typeof obs.temperature !== 'number' || obs.temperature < 30.0 || obs.temperature > 45.0) {
        errors.push(`Body temperature ${obs.temperature}°C is out of bounds (30-45°C).`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validation;
}
