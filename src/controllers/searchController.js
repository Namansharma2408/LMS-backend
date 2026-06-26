import { getUsers, getCourses } from "../data/db.js";

export const search = async (req, res) => {
  try {
    const query = req.query.query?.trim();

    if (!query) {
      return res.status(200).json([]);
    }

    const regex = new RegExp(query, "i");

    const users = await getUsers();
    const courses = await getCourses();

    const matchedUsers = users
      .filter((user) => regex.test(user.name) || regex.test(user.email))
      .slice(0, 5)
      .map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }));

    const matchedCourses = courses
      .filter((course) => regex.test(course.name) || regex.test(course.description) || regex.test(course.category))
      .slice(0, 5)
      .map((course) => ({
        _id: course._id,
        name: course.name,
        title: course.name,
        thumbnail: course.thumbnail,
        price: course.price,
        category: course.category,
      }));

    const results = [
      ...matchedUsers.map((user) => ({
        type: "user",
        ...user,
      })),

      ...matchedCourses.map((course) => ({
        type: "course",
        ...course,
      })),
    ];

    return res.status(200).json(results);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Search failed",
    });
  }
};