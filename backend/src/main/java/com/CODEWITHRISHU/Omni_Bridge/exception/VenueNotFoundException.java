package com.CODEWITHRISHU.Omni_Bridge.exception;

public class VenueNotFoundException extends RuntimeException {
    public VenueNotFoundException(String slug) {
        super("No venue found for slug: " + slug);
    }
}
