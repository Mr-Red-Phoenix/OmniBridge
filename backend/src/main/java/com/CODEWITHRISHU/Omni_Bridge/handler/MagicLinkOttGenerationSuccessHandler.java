package com.CODEWITHRISHU.Omni_Bridge.handler;

import com.CODEWITHRISHU.Omni_Bridge.service.BrevoMailService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.ott.OneTimeToken;
import org.springframework.security.web.authentication.ott.OneTimeTokenGenerationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class MagicLinkOttGenerationSuccessHandler implements OneTimeTokenGenerationSuccessHandler {

    private static final String RESPONSE = "{\"success\":true,\"message\":\"Magic link sent to your email successfully.\"}";

    private final BrevoMailService mail;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${ott.token.expiry.seconds}")
    private long expirySeconds;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, OneTimeToken oneTimeToken)
            throws IOException, ServletException {
        String email = oneTimeToken.getUsername();
        String link = UriComponentsBuilder.fromUriString(frontendUrl)
                .path("/login").queryParam("token", oneTimeToken.getTokenValue()).toUriString();

        mail.sendAsync(email, "Sign in to " + mail.appName(), mail.linkEmail(email, link, expirySeconds / 60));

        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(RESPONSE);
    }

}