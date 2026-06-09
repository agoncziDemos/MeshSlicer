#pragma once

/*
 * @brief 3D vector used by the native slicing code.
 */
struct Vec3 {
    /*
     * @brief X coordinate.
     */
    float x;

    /*
     * @brief Y coordinate.
     */
    float y;

    /*
     * @brief Z coordinate.
     */
    float z;
};

/*
 * @brief Adds two 3D vectors.
 * @param a First vector.
 * @param b Second vector.
 * @return Component-wise vector sum.
 */
Vec3 add(Vec3 a, Vec3 b);

/*
 * @brief Subtracts two 3D vectors.
 * @param a First vector.
 * @param b Second vector.
 * @return Component-wise vector difference.
 */
Vec3 subtract(Vec3 a, Vec3 b);

/*
 * @brief Scales a 3D vector.
 * @param value Source vector.
 * @param scale Scale factor.
 * @return Scaled vector.
 */
Vec3 multiply(Vec3 value, float scale);

/*
 * @brief Computes the dot product of two 3D vectors.
 * @param a First vector.
 * @param b Second vector.
 * @return Dot product value.
 */
float dot(Vec3 a, Vec3 b);

/*
 * @brief Computes squared distance between two 3D points.
 * @param a First point.
 * @param b Second point.
 * @return Squared distance.
 */
float squaredDistance(Vec3 a, Vec3 b);

/*
 * @brief Normalizes a 3D vector.
 * @param value Source vector.
 * @return Unit-length vector, or the original vector when its length is zero.
 */
Vec3 normalize(Vec3 value);
