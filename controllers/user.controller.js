import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import mongoose from "mongoose";
import Post from "../models/post.model.js";
import Event from "../models/eventModel.js";
import ConnectionRequest from "../models/connectionRequest.model.js";
export const getSuggestedConnections = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId).select(
      "connections"
    );

    // Suggested users excluding self and already connected users
    const suggestedUsers = await User.find({
      _id: {
        $ne: currentUserId,
        $nin: currentUser.connections,
      },
    })
      .select("name username profilePicture headline")
      .limit(10);

    // Fetch all connection requests involving the current user
    const connectionRequests = await ConnectionRequest.find({
      $or: [{ sender: currentUserId }, { recipient: currentUserId }],
    });

    // Map userId => status
    const requestMap = {};

    connectionRequests.forEach((req) => {
      const otherUserId = req.sender.equals(currentUserId)
        ? req.recipient.toString()
        : req.sender.toString();

      if (req.status === "pending") {
        requestMap[otherUserId] = req.sender.equals(currentUserId)
          ? "pending"
          : "received";
      } else if (req.status === "rejected") {
        requestMap[otherUserId] = "rejected";
      }
    });

    // Final suggestions with connection status
    const suggestionsWithStatus = suggestedUsers.map((user) => {
      const status = requestMap[user._id.toString()] || "not_connected";
      return {
        _id: user._id,
        name: user.name,
        username: user.username,
        profilePicture: user.profilePicture,
        headline: user.headline,
        status,
      };
    });

    res.json(suggestionsWithStatus);
  } catch (error) {
    console.error("Error in getSuggestedConnections controller:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error in getPublicProfile controller:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  console.log("guuuullllooooooooooooooooooooooo", req.body);
  try {
    const allowedFields = [
      "name",
      "username",
      "headline",
      "about",
      "location",
      "skills",
      "experience",
      "education",
      "certifications",
    ];

    const updatedData = {};

    for (const field of allowedFields) {
      if (req.body[field]) {
        updatedData[field] = req.body[field];
      }
    }

    if (req.files?.profilePicture) {
      const file = req.files.profilePicture[0]; // Get the file
      const result = await cloudinary.uploader.upload(file.path); // Upload file
      updatedData.profilePicture = result.secure_url;
    }

    if (req.files?.bannerImg) {
      const file = req.files.bannerImg[0]; // Get the file
      const result = await cloudinary.uploader.upload(file.path); // Upload file
      updatedData.bannerImg = result.secure_url;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updatedData },
      { new: true }
    ).select("-password");

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Error in updateProfile controller:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const addCertification = async (req, res) => {
  try {
    const { title, institute, startDate, endDate, description, file } =
      req.body;

    if (!title || !institute || !startDate || !endDate || !description) {
      return res.status(400).json({
        success: false,
        message: "All certification fields are required.",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let fileUrl = "";

    if (file) {
      const uploadResult = await cloudinary.uploader.upload(file, {
        folder: "certifications",
        resource_type: "auto",
      });
      fileUrl = uploadResult.secure_url;
    }

    const newCertification = {
      _id: new mongoose.Types.ObjectId(),
      title,
      institute,
      startDate,
      endDate,
      description,
      file: fileUrl,
    };

    user.certifications.push(newCertification);
    await user.save();

    res.status(201).json({
      success: true,
      message: "Certification added successfully",
      data: user.certifications,
    });
  } catch (error) {
    console.error("Error in addCertification:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const addExperience = async (req, res) => {
  try {
    const { title, company, startDate, endDate, description } = req.body;

    if (!title || !company || !startDate || !endDate || !description) {
      return res.status(400).json({
        success: false,
        message: "All experience fields are required",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create a new experience object
    const newExperience = {
      _id: new mongoose.Types.ObjectId(),
      title,
      company,
      startDate,
      endDate,
      description,
    };

    user.experience.push(newExperience);

    await user.save();

    res.json({ success: true, data: user.experience });
  } catch (error) {
    console.error("Error in addExperience:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const addEducation = async (req, res) => {
  try {
    const { school, fieldOfStudy, startYear, endYear } = req.body;

    if (!school || !fieldOfStudy || !startYear) {
      return res.status(400).json({
        success: false,
        message: "School, fieldOfStudy, and startYear are required.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the education already exists
    const exists = user.education.some(
      (edu) =>
        edu.school === school &&
        edu.fieldOfStudy === fieldOfStudy &&
        edu.startYear === startYear
    );

    if (exists) {
      return res
        .status(400)
        .json({ message: `Education at ${school} already exists.` });
    }

    // Create new education entry
    const newEducation = {
      _id: new mongoose.Types.ObjectId(),
      school,
      fieldOfStudy,
      startYear,
      endYear: endYear || null,
    };

    user.education.push(newEducation);
    await user.save();

    res.json({ success: true, data: user.education });
  } catch (error) {
    console.error("Error in addEducation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// ------------------------------------------------------------
export const updateCertification = async (req, res) => {
  try {
    const { certId, title, institute, startDate, endDate, description } =
      req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const certification = user.certifications.id(certId);
    if (!certification) {
      return res.status(404).json({ message: "Certification not found" });
    }

    certification.title = title || certification.title;
    certification.institute = institute || certification.institute;
    certification.startDate = startDate || certification.startDate;
    certification.endDate = endDate || certification.endDate;
    certification.description = description || certification.description;

    await user.save();
    res.json({ success: true, data: user.certifications });
  } catch (error) {
    console.error("Error in updateCertification:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateExperience = async (req, res) => {
  try {
    const { expId, title, company, startDate, endDate, description } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const experience = user.experience.id(expId);
    if (!experience) {
      return res.status(404).json({ message: "Experience not found" });
    }

    experience.title = title || experience.title;
    experience.company = company || experience.company;
    experience.startDate = startDate || experience.startDate;
    experience.endDate = endDate || experience.endDate;
    experience.description = description || experience.description;

    await user.save();
    res.json({ success: true, data: user.experience });
  } catch (error) {
    console.error("Error in updateExperience:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateEducation = async (req, res) => {
  try {
    const { eduId, school, fieldOfStudy, startYear, endYear } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const education = user.education.id(eduId);
    if (!education) {
      return res.status(404).json({ message: "Education not found" });
    }

    education.school = school || education.school;
    education.fieldOfStudy = fieldOfStudy || education.fieldOfStudy;
    education.startYear = startYear || education.startYear;
    education.endYear = endYear || education.endYear;

    await user.save();
    res.json({ success: true, data: user.education });
  } catch (error) {
    console.error("Error in updateEducation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Skills
export const getSkills = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("skills");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ success: true, data: user.skills });
  } catch (error) {
    console.error("Error in getSkills:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Add a Skill
export const addSkill = async (req, res) => {
  try {
    const { skill } = req.body;

    if (!skill) {
      return res.status(400).json({ message: "Skill is required." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.skills.includes(skill)) {
      return res.status(400).json({ message: "Skill already exists." });
    }

    user.skills.push(skill);
    await user.save();

    res.json({ success: true, data: user.skills });
  } catch (error) {
    console.error("Error in addSkill:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Update a Skill
export const updateSkill = async (req, res) => {
  try {
    const { oldSkill, newSkill } = req.body;

    if (!oldSkill || !newSkill) {
      return res
        .status(400)
        .json({ message: "Both old and new skills are required." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const skillIndex = user.skills.indexOf(oldSkill);
    if (skillIndex === -1) {
      return res.status(404).json({ message: "Skill not found." });
    }

    user.skills[skillIndex] = newSkill;
    await user.save();

    res.json({ success: true, data: user.skills });
  } catch (error) {
    console.error("Error in updateSkill:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Delete a Skill
export const deleteSkill = async (req, res) => {
  try {
    const { skill } = req.body;

    if (!skill) {
      return res.status(400).json({ message: "Skill is required." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const skillIndex = user.skills.indexOf(skill);
    if (skillIndex === -1) {
      return res.status(404).json({ message: "Skill not found." });
    }

    user.skills.splice(skillIndex, 1);
    await user.save();

    res.json({ success: true, data: user.skills });
  } catch (error) {
    console.error("Error in deleteSkill:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ------------------------------------------------------------

// export const getUserReport = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     console.log(userId, "UUSSSEERRR-IIDD");

//     const totalPosts = await Post.countDocuments({ author: userId });

//     const userPosts = await Post.find({ author: userId });
//     const totalComments = userPosts.reduce(
//       (sum, post) => sum + post.comments.length,
//       0
//     );

//     const totalShares = await Post.countDocuments({
//       sharedPost: { $ne: null },
//       author: userId,
//     });

//     const totalLikes = userPosts.reduce(
//       (sum, post) => sum + post.likes.length,
//       0
//     );

//     const totalEvents = await Event.countDocuments();
//     const userEvents = await Event.countDocuments({ author: userId });

//     res.status(200).json({
//       success: true,
//       data: {
//         totalPosts,
//         totalComments,
//         totalShares,
//         totalLikes,
//         totalEvents,
//         userEvents,
//       },
//     });
//   } catch (error) {
//     console.error("Error in getUserReport controller:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
export const getUserReport = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(userId, "UUSSSEERRR-IIDD");

    // 🟢 Total Posts & Related Stats
    const totalPosts = await Post.countDocuments({ author: userId });
    const userPosts = await Post.find({ author: userId });
    const totalComments = userPosts.reduce(
      (sum, post) => sum + post.comments.length,
      0
    );
    const totalShares = await Post.countDocuments({
      sharedPost: { $ne: null },
      author: userId,
    });
    const totalLikes = userPosts.reduce(
      (sum, post) => sum + post.likes.length,
      0
    );

    // 🟢 Total Events & Related Stats
    const totalEvents = await Event.countDocuments();
    const userEvents = await Event.countDocuments({ author: userId });

    // 🟢 Total Likes, Comments & Shares on Events
    const allEvents = await Event.find();
    const totalEventLikes = allEvents.reduce(
      (sum, event) => sum + (event.likes ? event.likes.length : 0),
      0
    );
    const totalEventComments = allEvents.reduce(
      (sum, event) => sum + (event.comments ? event.comments.length : 0),
      0
    );
    const totalEventShares = allEvents.reduce(
      (sum, event) => sum + (event.shares ? event.shares.length : 0),
      0
    );

    res.status(200).json({
      success: true,
      data: {
        totalPosts,
        totalComments,
        totalShares,
        totalLikes,
        totalEvents,
        userEvents,
        totalEventLikes,
        totalEventComments,
        totalEventShares,
      },
    });
  } catch (error) {
    console.error("Error in getUserReport controller:", error);
    res.status(500).json({ message: "Server error" });
  }
};
