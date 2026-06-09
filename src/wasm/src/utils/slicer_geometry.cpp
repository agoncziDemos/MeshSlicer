#include "slicer_geometry.hpp"

#include <cmath>
#include <cstddef>
#include <vector>

#include "triangle_buffer.hpp"

namespace {

constexpr float kIntersectionEpsilon = 1.0e-5f;
constexpr float kIntersectionEpsilonSquared =
    kIntersectionEpsilon * kIntersectionEpsilon;

/*
 * @brief Adds a point to a list when an equivalent point is not already present.
 *
 * @param points Point list to update.
 * @param point Point to add.
 */
void addUniquePoint(std::vector<Vec3>& points, Vec3 point) {
    for (const Vec3 existingPoint : points) {
        if (squaredDistance(existingPoint, point) <= kIntersectionEpsilonSquared) {
            return;
        }
    }

    points.push_back(point);
}

/*
 * @brief Adds an edge-plane intersection point when the edge crosses the plane.
 *
 * @param intersections Intersection point list to update.
 * @param a First edge endpoint.
 * @param b Second edge endpoint.
 * @param distanceA Signed plane distance for the first endpoint.
 * @param distanceB Signed plane distance for the second endpoint.
 */
void addEdgePlaneIntersection(
    std::vector<Vec3>& intersections,
    Vec3 a,
    Vec3 b,
    float distanceA,
    float distanceB
) {
    const bool aOnPlane = std::abs(distanceA) <= kIntersectionEpsilon;
    const bool bOnPlane = std::abs(distanceB) <= kIntersectionEpsilon;

    if (aOnPlane && bOnPlane) {
        return;
    }

    if (aOnPlane) {
        addUniquePoint(intersections, a);
        return;
    }

    if (bOnPlane) {
        addUniquePoint(intersections, b);
        return;
    }

    const bool crossesPlane =
        (distanceA < 0.0f && distanceB > 0.0f) ||
        (distanceA > 0.0f && distanceB < 0.0f);

    if (!crossesPlane) {
        return;
    }

    const float t = distanceA / (distanceA - distanceB);
    const Vec3 intersection = add(a, multiply(subtract(b, a), t));

    addUniquePoint(intersections, intersection);
}

/*
 * @brief Appends one projected 2D segment to the output buffer.
 *
 * @param segments Flat output buffer arranged as ax, ay, bx, by per segment.
 * @param a First 3D endpoint.
 * @param b Second 3D endpoint.
 * @param planeFrame Plane frame used for 3D-to-2D projection.
 */
void appendProjectedSegment(
    std::vector<float>& segments,
    Vec3 a,
    Vec3 b,
    const PlaneFrame& planeFrame
) {
    const Vec3 localA = subtract(a, planeFrame.origin);
    const Vec3 localB = subtract(b, planeFrame.origin);

    segments.push_back(dot(localA, planeFrame.axisX));
    segments.push_back(dot(localA, planeFrame.axisY));
    segments.push_back(dot(localB, planeFrame.axisX));
    segments.push_back(dot(localB, planeFrame.axisY));
}

} // namespace

bool readPlaneFrame(const std::vector<float>& values, PlaneFrame& output) {
    if (values.size() < 12) {
        return false;
    }

    output.origin = readTrianglePoint(values, 0);
    output.axisX = normalize(readTrianglePoint(values, 3));
    output.axisY = normalize(readTrianglePoint(values, 6));
    output.normal = normalize(readTrianglePoint(values, 9));

    return true;
}

PlaneFrame getShiftedPlaneFrame(const PlaneFrame& planeFrame, float offset) {
    PlaneFrame shiftedPlaneFrame = planeFrame;

    shiftedPlaneFrame.origin = add(
        planeFrame.origin,
        multiply(planeFrame.normal, offset)
    );

    return shiftedPlaneFrame;
}

void appendTriangleSliceSegment(
    const std::vector<float>& vertices,
    std::size_t triangleOffset,
    const PlaneFrame& planeFrame,
    std::vector<float>& segments
) {
    const Vec3 a = readTrianglePoint(vertices, triangleOffset);
    const Vec3 b = readTrianglePoint(vertices, triangleOffset + 3);
    const Vec3 c = readTrianglePoint(vertices, triangleOffset + 6);

    const float distanceA = dot(subtract(a, planeFrame.origin), planeFrame.normal);
    const float distanceB = dot(subtract(b, planeFrame.origin), planeFrame.normal);
    const float distanceC = dot(subtract(c, planeFrame.origin), planeFrame.normal);

    std::vector<Vec3> intersections;
    intersections.reserve(3);

    addEdgePlaneIntersection(intersections, a, b, distanceA, distanceB);
    addEdgePlaneIntersection(intersections, b, c, distanceB, distanceC);
    addEdgePlaneIntersection(intersections, c, a, distanceC, distanceA);

    if (intersections.size() == 2) {
        appendProjectedSegment(
            segments,
            intersections[0],
            intersections[1],
            planeFrame
        );
    }
}
