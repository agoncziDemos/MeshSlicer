#pragma once

#include <cstddef>
#include <vector>

#include "vec3.hpp"

constexpr std::size_t kFloatsPerTriangle = 9;
constexpr std::size_t kFloatsPerSegment = 4;

/*
 * @brief Gets the number of complete triangle faces stored in a flat vertex buffer.
 *
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values.
 * @return Number of complete triangle faces in the buffer.
 */
std::size_t getTriangleCount(const std::vector<float>& vertices);

/*
 * @brief Gets the first float offset for a triangle in a flat vertex buffer.
 *
 * @param triangleIndex Index of the triangle to read.
 * @return Offset of the triangle's first float.
 */
std::size_t getTriangleOffset(std::size_t triangleIndex);

/*
 * @brief Reads a 3D point from a flat triangle vertex buffer.
 *
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values.
 * @param offset Index of the first x, y, z value.
 * @return 3D point read from the buffer.
 */
Vec3 readTrianglePoint(const std::vector<float>& vertices, std::size_t offset);
