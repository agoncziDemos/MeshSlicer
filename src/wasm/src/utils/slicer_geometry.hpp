#pragma once

#include <cstddef>
#include <vector>

#include "vec3.hpp"

/*
 * @brief Local coordinate frame for one slicing plane.
 */
struct PlaneFrame {
    /*
     * @brief Origin of the slicing plane in world coordinates.
     */
    Vec3 origin;

    /*
     * @brief Local x axis of the slicing plane.
     */
    Vec3 axisX;

    /*
     * @brief Local y axis of the slicing plane.
     */
    Vec3 axisY;

    /*
     * @brief Unit normal of the slicing plane.
     */
    Vec3 normal;
};

/*
 * @brief Reads a plane frame from a flat float buffer.
 * @param values Flat buffer arranged as origin, axisX, axisY, normal.
 * @param output Plane frame populated from the buffer.
 * @return True when the buffer contains enough values.
 */
bool readPlaneFrame(const std::vector<float>& values, PlaneFrame& output);

/*
 * @brief Returns a copy of a plane frame shifted along its normal.
 * @param planeFrame Base plane frame.
 * @param offset Signed offset along the plane normal.
 * @return Shifted plane frame.
 */
PlaneFrame getShiftedPlaneFrame(const PlaneFrame& planeFrame, float offset);

/*
 * @brief Appends the segment produced by intersecting one triangle with one slicing plane.
 * @param vertices Flat triangle vertex buffer arranged as x, y, z values.
 * @param triangleOffset Offset of the triangle's first float in the vertex buffer.
 * @param planeFrame Plane frame used for intersection and projection.
 * @param segments Flat output buffer arranged as ax, ay, bx, by per segment.
 */
void appendTriangleSliceSegment(
    const std::vector<float>& vertices,
    std::size_t triangleOffset,
    const PlaneFrame& planeFrame,
    std::vector<float>& segments
);
