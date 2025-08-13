import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography
} from '@mui/material';

const UpdateApiKeyModal = ({ open, onClose, currentKey, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  // ✅ Sync local state with currentKey when modal opens
  useEffect(() => {
    if (open) {
      setApiKey(currentKey || '');
      setError('');
    }
  }, [open, currentKey]);

  const handleSave = () => {
    if (!apiKey) {
      setError('Please enter a valid Planet API Key.');
      return;
    }
    onSave(apiKey);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Enter / Update API Key</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
        //   label="Planet API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="e.g., PLAKxxxxx…"
          error={!!error}
          helperText={error}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="text">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpdateApiKeyModal;
