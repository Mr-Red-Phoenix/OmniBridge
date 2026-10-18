package com.CODEWITHRISHU.Omni_Bridge.dto.request;

import com.CODEWITHRISHU.Omni_Bridge.entity.Role;
import jakarta.validation.constraints.NotNull;

public record StaffRoleUpdateRequest(
        @NotNull Role role) {
}

