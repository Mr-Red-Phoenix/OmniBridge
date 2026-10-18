package com.CODEWITHRISHU.Omni_Bridge.entity.staff;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "venue")
@Getter
@Setter
@AllArgsConstructor
public class Venue {
    public Venue() {
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(nullable = false, length = 300)
    private String address;

    @Column(name = "emergency_instructions", nullable = false, length = 1000)
    private String emergencyInstructions;

    @Column(name = "gate_code", length = 100)
    private String gateCode;

    @Column(name = "knox_box_location", length = 255)
    private String knoxBoxLocation;

    @Column(name = "floor_plan_url", length = 500)
    private String floorPlanUrl;

    @Column(name = "emergency_contact_phone", length = 50)
    private String emergencyContactPhone;
}