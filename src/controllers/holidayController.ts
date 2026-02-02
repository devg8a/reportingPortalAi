import Holiday from '../db/models/holiday';

export const getAllHolidays = async (req, res) => {
  try {
    const { 
      searchText, 
      status, 
      sortBy = 'start_date', 
      sortOrder = 'asc',
      page = 1, 
      limit = 10 
    } = req.query;

    // filter object
    const filter: Record<string, any> = {};

    if (status === 'active' || status === 'inactive') {
      filter.status = status;
    }

    if (searchText) {
      filter.name = { $regex: searchText, $options: 'i' };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const sort: Record<string, any> = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const holidays = await Holiday.find(filter)
      .populate('name start_date end_date prev_start_date prev_end_date')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit as string));

    const formattedHolidays = holidays.map((holiday: any) => {
      const formatDate = (date: string) => {
        return new Date(date).toISOString().split('T')[0]; 
      };

      return {
        ...holiday.toObject(), 
        start_date: formatDate(holiday.start_date),
        end_date: formatDate(holiday.end_date),
        prev_start_date: formatDate(holiday.prev_start_date),
        prev_end_date: formatDate(holiday.prev_end_date)
      };
    });

    const totalHolidays = await Holiday.countDocuments(filter);
    const totalPages = Math.ceil(totalHolidays / parseInt(limit as string));

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Holidays has been fetched successfully',
      data: {
        holidays: formattedHolidays,  
        pagination: {
          count: formattedHolidays.length,
          total: totalHolidays,
          page: parseInt(page as string),
          totalPages,
          limit: parseInt(limit as string)
        },
        filters: {
          searchText: searchText || null,
          status: status || null,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Get holidays error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error fetching holidays',
      data: error.message
    });
  }
};

export const createHoliday = async (req, res) => {
  try {
    const {
      name,
      start_date,
      end_date,
      prev_start_date,
      prev_end_date,
      ordering,
      status
    } = req.body;
    if (!name || !start_date || !end_date) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Name, start date, and end date are required',
        data: null
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (endDate < startDate) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'End date cannot be before start date',
        data: null
      });
    }

    let prevStartDate: Date | null = null;
    let prevEndDate: Date | null = null;
    if (prev_start_date && prev_end_date) {
      prevStartDate = new Date(prev_start_date);
      prevEndDate = new Date(prev_end_date);
      
      if (prevEndDate < prevStartDate) {
        return res.status(422).json({
          status_code: 422,
          success: false,
          message: 'Previous end date cannot be before previous start date',
          data: null
        });
      }
      
      const currentYear = startDate.getFullYear();
      const prevYear = prevStartDate.getFullYear();
      if (currentYear === prevYear) {
        return res.status(422).json({
          status_code: 422,
          success: false,
          message: 'Current year and previous year cannot be the same',
          data: null
        });
      }
    }

    const overlappingConditions: any[] = [
      { start_date: { $lte: endDate }, end_date: { $gte: startDate } }
    ];
    if (prevStartDate && prevEndDate) {
      overlappingConditions.push({
        prev_start_date: { $lte: prevEndDate },
        prev_end_date: { $gte: prevStartDate }
      });
    }
    const existingHoliday = await Holiday.findOne({
      name: { $regex: `^${name}$`, $options: 'i' },
      $or: overlappingConditions
    });

    if (existingHoliday) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Holiday with overlapping dates already exists',
        data: null
      });
    }

    const holiday = new Holiday({
      name,
      start_date: startDate,
      end_date: endDate,
      ordering: ordering,
      prev_start_date: prev_start_date ? new Date(prev_start_date) : null,
      prev_end_date: prev_end_date ? new Date(prev_end_date) : null,
      status: status || 'active',
      created_by: req.user._id
    });

    await holiday.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Holidays has been created successfully',
      data: holiday
    });

  } catch (error) {
    console.error('Create holiday error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error creating holiday',
      data: error.message
    });
  }
};

export const getHolidayById = async (req, res) => {
  try {
    const { holidayId } = req.params;

    const holiday = await Holiday.findById(holidayId)
      .populate('name start_date end_date prev_start_date prev_end_date');

    if (!holiday) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Holiday not found',
        data: null
      });
    }
    const formatDate = (date: Date) =>
      date ? new Date(date).toISOString().split('T')[0] : null;
    const formattedHoliday = {
      ...holiday.toObject(),
      start_date: formatDate(holiday.start_date),
      end_date: formatDate(holiday.end_date),
      prev_start_date: formatDate(holiday.prev_start_date),
      prev_end_date: formatDate(holiday.prev_end_date)
    };
    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Holiday has been fetched successfully',
      data: formattedHoliday
    });

  } catch (error) {
    console.error('Get holiday error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error fetching holiday',
      data: error.message
    });
  }
};


export const updateHoliday = async (req, res) => {
  try {
    const { holidayId } = req.params;
    const updateData = req.body;

    const holiday = await Holiday.findById(holidayId);
    if (!holiday) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Holiday not found',
        data: null
      });
    }

    let startDate = holiday.start_date;
    let endDate = holiday.end_date;
    if (updateData.start_date || updateData.end_date) {
      startDate = updateData.start_date ? new Date(updateData.start_date) : holiday.start_date;
      endDate = updateData.end_date ? new Date(updateData.end_date) : holiday.end_date;
      
      if (endDate < startDate) {
        return res.status(422).json({
          status_code: 422,
          success: false,
          message: 'End date cannot be before start date',
          data: null
        });
      }
    }

    let prevStartDate: Date | null = holiday.prev_start_date;
    let prevEndDate: Date | null = holiday.prev_end_date;
    if (updateData.prev_start_date || updateData.prev_end_date) {
      prevStartDate = updateData.prev_start_date ? 
        new Date(updateData.prev_start_date) : holiday.prev_start_date;
      prevEndDate = updateData.prev_end_date ? 
        new Date(updateData.prev_end_date) : holiday.prev_end_date;
      
      if (prevStartDate && prevEndDate && prevEndDate < prevStartDate) {
        return res.status(422).json({
          status_code: 422,
          success: false,
          message: 'Previous end date cannot be before previous start date',
          data: null
        });
      }
      if (prevStartDate && prevEndDate) {
        const currentYear = startDate.getFullYear();
        const prevYear = prevStartDate.getFullYear();
        
        if (currentYear === prevYear) {
          return res.status(422).json({
            status_code: 422,
            success: false,
            message: 'Current year and previous year cannot be the same',
            data: null
          });
        }
      }
    }

    if (updateData.name || updateData.start_date || updateData.end_date || 
        updateData.prev_start_date || updateData.prev_end_date) {
      const name = updateData.name || holiday.name;

      const overlappingConditions: any[] = [
        { start_date: { $lte: endDate }, end_date: { $gte: startDate } }
      ];

      if (prevStartDate && prevEndDate) {
        overlappingConditions.push({
          prev_start_date: { $lte: prevEndDate },
          prev_end_date: { $gte: prevStartDate }
        });
      }

      const overlappingHoliday = await Holiday.findOne({
        _id: { $ne: holidayId },
        name: { $regex: `^${name}$`, $options: 'i' },
        $or: overlappingConditions
      });

      if (overlappingHoliday) {
        return res.status(422).json({
          status_code: 422,
          success: false,
          message: 'Holiday with overlapping dates already exists',
          data: null
        });
      }
    }
    Object.assign(holiday, updateData);
    await holiday.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Holiday has been updated successfully',
      data: holiday
    });

  } catch (error) {
    console.error('Update holiday error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error updating holiday',
      data: error.message
    });
  }
};

export const deleteHoliday = async (req, res) => {
  try {
    const { holidayId } = req.params;

    const holiday = await Holiday.findById(holidayId);
    if (!holiday) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Holiday not found',
        data: null
      });
    }

    await Holiday.findByIdAndDelete(holidayId);

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Holiday has been deleted successfully',
      data: {
        deleted_holiday_id: holidayId,
        name: holiday.name
      }
    });

  } catch (error) {
    console.error('Delete holiday error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error deleting holiday',
      data: error.message
    });
  }
};