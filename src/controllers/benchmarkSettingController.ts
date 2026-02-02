import ClientSetting from '../db/models/benchmarkSetting';

// Create Client Setting
export const createClientSetting = async (req, res) => {
  try {
    const {
      date,
      benchmarks,
    } = req.body;

    // Check if client setting already exists
    const existingSetting = await ClientSetting.findOne();
    if (existingSetting) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Client setting already exists. Use update API instead.',
        data: null
      });
    }

    // Validate required fields
    if (!date) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Benchmark start date is required',
        data: null
      });
    }

    // Create default benchmarks structure if not provided
    const defaultBenchmarks = {
      spend: {
        microdata: "",
        evergreen: "",
        promo1st: "",
        promo2nd: ""
      },
      cpoc: {
        microdata: "",
        evergreen: "",
        promo1st: "",
        promo2nd: ""
      },
      octr: {
        microdata: "",
        evergreen: "",
        promo1st: "",
        promo2nd: ""
      },
      roas: {
        microdata: "",
        evergreen: "",
        promo1st: "",
        promo2nd: ""
      },
      cpa: {
        microdata: "",
        evergreen: "",
        promo1st: "",
        promo2nd: ""
      }
    };

    const clientSetting = new ClientSetting({
      date,
      benchmarks: benchmarks || defaultBenchmarks,
    });

    await clientSetting.save();

    return res.status(201).json({
      status_code: 201,
      success: true,
      message: 'Client setting created successfully',
      data: clientSetting
    });

  } catch (error) {
    console.error('Create client setting error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

// Update Client Setting
// export const updateClientSetting = async (req, res) => {
//   try {
//     const { settingId } = req.params;
//     const updateData = req.body;

//     const clientSetting = await ClientSetting.findById(settingId);
//     if (!clientSetting) {
//       return res.status(404).json({
//         status_code: 404,
//         success: false,
//         message: 'Client setting not found',
//         data: null
//       });
//     }

//     // Merge benchmarks if provided
//     if (updateData.benchmarks && typeof updateData.benchmarks === 'object') {
//       const currentBenchmarks = clientSetting.benchmarks.toObject();
//       updateData.benchmarks = {
//         spend: { ...currentBenchmarks.spend, ...updateData.benchmarks.spend },
//         cpoc: { ...currentBenchmarks.cpoc, ...updateData.benchmarks.cpoc },
//         octr: { ...currentBenchmarks.octr, ...updateData.benchmarks.octr },
//         roas: { ...currentBenchmarks.roas, ...updateData.benchmarks.roas },
//         cpa: { ...currentBenchmarks.cpa, ...updateData.benchmarks.cpa }
//       };
//     }

//     Object.assign(clientSetting, updateData);
//     await clientSetting.save();

//     return res.status(200).json({
//       status_code: 200,
//       success: true,
//       message: 'Client setting updated successfully',
//       data: clientSetting
//     });
//   } catch (error) {
//     console.error('Update client setting error:', error);
//     return res.status(500).json({
//       status_code: 500,
//       success: false,
//       message: 'Internal server error',
//       data: null
//     });
//   }
// };

// Get Client Setting
export const getClientSetting = async (req, res) => {
  try {
    const { settingId } = req.params;

    const clientSetting = await ClientSetting.findById(settingId);
    if (!clientSetting) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client setting not found',
        data: null
      });
    }

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Client setting fetched successfully',
      data: clientSetting
    });
  } catch (error) {
    console.error('Get client setting error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const getAllClientSettings = async (req, res) => {
  try {
    const clientSettings = await ClientSetting.find();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Client settings fetched successfully',
      data: clientSettings
    });
  } catch (error) {
    console.error('Get all client settings error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

