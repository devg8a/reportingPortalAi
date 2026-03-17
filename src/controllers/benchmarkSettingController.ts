import ClientSetting from '../db/models/benchmarkSetting';

export const createClientSetting = async (req, res) => {
  try {
    const { clientId } = req.params; 
    const {
      date,
      benchmarks,
    } = req.body;
    if (!clientId) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Client ID is required in URL parameters',
        data: null
      });
    }

    if (!date) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Benchmark start date is required',
        data: null
      });
    }

    const existingSetting = await ClientSetting.findOne({ client_id: clientId });
    if (existingSetting) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Client setting already exists for this client. Use update API instead.',
        data: null
      });
    }
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
      client_id: clientId, // Use clientId from params
      date,
      benchmarks: benchmarks || defaultBenchmarks,
    });

    await clientSetting.save();

    return res.status(200).json({
      status_code: 200,
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

export const updateClientSetting = async (req, res) => {
  try {
    const { settingId } = req.params;
    const updateData = req.body;

    const clientSetting = await ClientSetting.findById(settingId);
    if (!clientSetting) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client setting not found',
        data: null
      });
    }
    if (updateData.benchmarks && typeof updateData.benchmarks === 'object') {
      const currentBenchmarks = clientSetting.benchmarks || {};

      updateData.benchmarks = {
        spend: {
          ...(currentBenchmarks as any).spend,
          ...updateData.benchmarks.spend,
        },
        cpoc: {
          ...(currentBenchmarks as any).cpoc,
          ...updateData.benchmarks.cpoc,
        },
        octr: {
          ...(currentBenchmarks as any).octr,
          ...updateData.benchmarks.octr,
        },
        roas: {
          ...(currentBenchmarks as any).roas,
          ...updateData.benchmarks.roas,
        },
        cpa: {
          ...(currentBenchmarks as any).cpa,
          ...updateData.benchmarks.cpa,
        },
      };
    }


    Object.assign(clientSetting, updateData);
    await clientSetting.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Client setting updated successfully',
      data: clientSetting
    });
  } catch (error) {
    console.error('Update client setting error:', error);
    return res.status(401).json({
      status_code: 401,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};
