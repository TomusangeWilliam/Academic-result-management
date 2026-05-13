const Term = require('../models/Term');

// @desc    Get all terms
// @route   GET /api/terms
exports.getTerms = async (req, res) => {
    try {
        const terms = await Term.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: terms });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a term
// @route   POST /api/terms
exports.createTerm = async (req, res) => {
    try {
        const term = await Term.create(req.body);
        res.status(201).json({ success: true, data: term });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update a term
// @route   PUT /api/terms/:id
exports.updateTerm = async (req, res) => {
    try {
        const term = await Term.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!term) {
            return res.status(404).json({ success: false, message: 'Term not found' });
        }
        res.status(200).json({ success: true, data: term });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete a term
// @route   DELETE /api/terms/:id
exports.deleteTerm = async (req, res) => {
    try {
        const term = await Term.findByIdAndDelete(req.params.id);
        if (!term) {
            return res.status(404).json({ success: false, message: 'Term not found' });
        }
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
