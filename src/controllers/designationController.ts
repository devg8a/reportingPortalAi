import Designation from '../db/models/designation';

export const createDesignation = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Designation name is required',
        data: null
      });
    }

    const existingDesignation = await Designation.findOne({ name });
    if (existingDesignation) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Designation already exists',
        data: null
      });
    }

    const designation = new Designation({ name });
    await designation.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Record has been created successfully',
      data: designation
    });

  } catch (error) {
    console.error('Create designation error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error creating designation',
      data: error.message
    });
  }
};

export const getAllDesignations = async (req, res) => {
  try {
    const designations = await Designation.find()
      .sort({ name: 1 });

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Designations has been fetched successfully',
      data: {
        designations,
        count: designations.length
      }
    });

  } catch (error) {
    console.error('Get designations error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error fetching designations',
      data: error.message
    });
  }
};