#include "vec3.hpp"

#include <cmath>

namespace {

constexpr float kNormalizeEpsilon = 1.0e-8f;

} // namespace

Vec3 add(Vec3 a, Vec3 b) {
    return {
        a.x + b.x,
        a.y + b.y,
        a.z + b.z,
    };
}

Vec3 subtract(Vec3 a, Vec3 b) {
    return {
        a.x - b.x,
        a.y - b.y,
        a.z - b.z,
    };
}

Vec3 multiply(Vec3 value, float scale) {
    return {
        value.x * scale,
        value.y * scale,
        value.z * scale,
    };
}

float dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

float squaredDistance(Vec3 a, Vec3 b) {
    const Vec3 difference = subtract(a, b);

    return dot(difference, difference);
}

Vec3 normalize(Vec3 value) {
    const float length = std::sqrt(dot(value, value));

    if (length <= kNormalizeEpsilon) {
        return value;
    }

    return multiply(value, 1.0f / length);
}
