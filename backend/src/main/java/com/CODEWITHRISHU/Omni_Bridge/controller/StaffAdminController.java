package com.CODEWITHRISHU.Omni_Bridge.controller;

import com.CODEWITHRISHU.Omni_Bridge.dto.request.StaffRoleUpdateRequest;
import com.CODEWITHRISHU.Omni_Bridge.dto.response.StaffSummaryResponse;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/staff/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class StaffAdminController {

    private final AuthService authService;

    @GetMapping
    public ResponseEntity<List<StaffSummaryResponse>> listStaffUsers(@AuthenticationPrincipal StaffUser admin) {
        return ResponseEntity.ok(authService.listStaffByVenue(admin.getVenue().getId()));
    }

    @PutMapping("/{userId}/role")
    public ResponseEntity<StaffSummaryResponse> updateStaffRole(
            @PathVariable Long userId,
            @Valid @RequestBody StaffRoleUpdateRequest request) {
        return ResponseEntity.ok(authService.updateStaffRole(userId, request.role()));
    }

    @PutMapping("/{userId}/approve")
    public ResponseEntity<StaffSummaryResponse> approveStaffUser(@PathVariable Long userId) {
        return ResponseEntity.ok(authService.approveStaffUser(userId));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteStaffUser(@PathVariable Long userId) {
        authService.deleteStaffUser(userId);
        return ResponseEntity.noContent().build();
    }

}

