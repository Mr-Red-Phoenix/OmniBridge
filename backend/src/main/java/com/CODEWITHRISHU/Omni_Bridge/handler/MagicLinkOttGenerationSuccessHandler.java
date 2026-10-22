package com.CODEWITHRISHU.Omni_Bridge.handler;

import com.CODEWITHRISHU.Omni_Bridge.service.BrevoMailService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.ott.OneTimeToken;
import org.springframework.security.web.authentication.ott.OneTimeTokenGenerationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@Slf4j
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
        String token = oneTimeToken.getTokenValue();
        String link = UriComponentsBuilder.fromUriString(frontendUrl)
                .path("/login").queryParam("token", token).toUriString();

        System.out.println("\n*******************************************************");
        System.out.println(">>> [SPRING SECURITY MAGIC LINK] " + link);
        System.out.println(">>> [MAGIC LINK TOKEN] " + token + " (Email: " + email + ")");
        System.out.println("*******************************************************\n");

        log.info("\n=======================================================\n"
                + ">>> [AUTH-DEV] SPRING SECURITY OTT MAGIC LINK GENERATED\n"
                + ">>> User Email: {}\n"
                + ">>> Original Magic Link Token: {}\n"
                + ">>> Magic Link URL: {}\n"
                + ">>> Expires In: {} seconds\n"
                + "=======================================================",
                email, token, link, expirySeconds);

        mail.sendAsync(email, "Sign in to " + mail.appName(), mail.linkEmail(email, link, expirySeconds / 60));

        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(RESPONSE);
    }

}