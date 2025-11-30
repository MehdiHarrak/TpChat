import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUser as loginUserRedux } from "../slices/userSlice";
import { loginUser } from "../user-api/loginApi";
import { Session } from "../model/common";
import { CustomError } from "../model/CustomError";
import { TextField, Button, Typography, Container, Box } from "@mui/material";

export function Login() {
    const [error, setError] = useState({} as CustomError);
    const [session, setSession] = useState({} as Session);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);

        loginUser(
            {
                user_id: -1,
                username: data.get("login") as string,
                password: data.get("password") as string
            },
            (result: Session) => {
                console.log(result);
                setSession(result);
                form.reset();
                setError(new CustomError(""));

                dispatch(loginUserRedux({
                    username:result.username ?? '',
                    token: result.token
                }));

                // Redirect to chat page after successful login
                navigate('/chat');
            },
            (loginError: CustomError) => {
                console.log(loginError);
                setError(loginError);
                setSession({} as Session);
            }
        );
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#f5f5f5',
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    bgcolor: '#3F51B5',
                    color: 'white',
                    py: 2,
                    px: 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <Typography variant="h5" component="h1" fontWeight="bold">
                    UBO Relay Chat
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        sx={{
                            color: 'white',
                            borderColor: 'white',
                            '&:hover': {
                                borderColor: 'white',
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                            },
                        }}
                    >
                        CONNEXION
                    </Button>
                    <Button
                        variant="outlined"
                        sx={{
                            color: 'white',
                            borderColor: 'white',
                            '&:hover': {
                                borderColor: 'white',
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                            },
                        }}
                        onClick={() => navigate('/signup')}
                    >
                        CRÉER UN COMPTE
                    </Button>
                </Box>
            </Box>

            {/* Main Content */}
            <Container
                maxWidth="sm"
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 4,
                }}
            >
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{
                        width: '100%',
                        maxWidth: 400,
                        bgcolor: 'white',
                        p: 4,
                        borderRadius: 2,
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    }}
                >
                    <Typography
                        variant="h4"
                        component="h2"
                        sx={{
                            textAlign: 'center',
                            mb: 4,
                            color: 'text.primary',
                            fontWeight: 'bold'
                        }}
                    >
                        Connexion
                    </Typography>

                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="login"
                        label="Identifiant *"
                        name="login"
                        autoComplete="username"
                        error={error.code === "UNAUTHORIZED"}
                        helperText={error.code === "UNAUTHORIZED" ? error.message : ""}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Mot de passe *"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        error={error.code === "UNAUTHORIZED"}
                        helperText={error.code === "UNAUTHORIZED" ? error.message : ""}
                        sx={{ mb: 3 }}
                    />

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{
                            mt: 2,
                            mb: 2,
                            py: 1.5,
                            bgcolor: '#1976D2',
                            '&:hover': {
                                bgcolor: '#1565C0',
                            },
                        }}
                    >
                        CONNEXION
                    </Button>

                    <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                            Pas encore de compte ?{' '}
                            <Button
                                variant="text"
                                onClick={() => navigate('/signup')}
                                sx={{
                                    color: '#1976D2',
                                    textTransform: 'none',
                                    p: 0,
                                    minWidth: 'auto',
                                }}
                            >
                                Créer un compte
                            </Button>
                        </Typography>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
}
