#include "triangle_buffer.hpp"

std::size_t getTriangleCount(const std::vector<float>& vertices) {
    return vertices.size() / kFloatsPerTriangle;
}

std::size_t getTriangleOffset(std::size_t triangleIndex) {
    return triangleIndex * kFloatsPerTriangle;
}

Vec3 readTrianglePoint(const std::vector<float>& vertices, std::size_t offset) {
    return {
        vertices[offset],
        vertices[offset + 1],
        vertices[offset + 2],
    };
}
