"use client";

import { domToPng } from "modern-screenshot";
import { jsPDF } from "jspdf";
import type { ReportWithZone } from "@/types";

// =============================================================================
// Types
// =============================================================================

interface PDFExportOptions {
  report: ReportWithZone;
  contentElement: HTMLElement;
  theme?: "light" | "dark";
}

// =============================================================================
// Constants - Logos
// =============================================================================

const GORGONE_LOGO_BLACK = `data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iQ2FscXVlXzIiIGRhdGEtbmFtZT0iQ2FscXVlIDIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDIxMS42OSA5Ni45NCI+CiAgPGRlZnM+CiAgICA8c3R5bGU+CiAgICAgIC5jbHMtMSB7CiAgICAgICAgZmlsbDogIzAwMDAwMDsKICAgICAgfQogICAgPC9zdHlsZT4KICA8L2RlZnM+CiAgPGcgaWQ9IkNhbHF1ZV8xLTIiIGRhdGEtbmFtZT0iQ2FscXVlIDEiPgogICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTkzLjM4LDYxLjc5cy0xLjU3LS4zMi00LjQ2LTEuNDFjMTIuMzUtMi45NSwyMS4yOS01LjU5LDIxLjI5LTUuNTkuMjctLjA0LjQ1LS4wOS40NS0uMDksNi4xOC0yLjA4LTE3LjI4LTQuMjEtMTcuMjgtNC4yMSwwLDAtMi4zNC0uNDYtNi42MS0yLjI3LDMuNTUtMS40Miw1LjQ5LTEuODEsNS40OS0xLjgxLDAsMCwyMy40Ni0yLjEyLDE3LjI4LTQuMjEsMCwwLS4xNi0uMDQtLjQ1LS4wOSwwLDAtMTQuNzUtNC4zNi0zMi41NC04LjEzbC0uMSwxLjA2YzkuOTYsMi4zLDE5LjY4LDQuNTUsMjguNDQsNi41OS01LjMxLS4zNy0xNC43Ni0uMzYtMjYuMSwyLjY0LTMuMDQtMS42OS02LjUtMy44My0xMC4zNC02LjUyLTIuNDctMS43My01LjEtMy43LTcuODYtNS45Miw1LjA0Ljk3LDEwLjI4LDIuMDMsMTUuNzMsMy4xOGwuMS0xLjA2Yy02LjEtMS40MS0xMi4yOS0yLjgyLTE4LjM5LTQuMjItMi44LTIuMzQtNS43My00LjkyLTguNzgtNy43OS0uNTEtLjQ4LTEuMDEtLjk1LTEuNTItMS40MS03LjgyLTcuMDItMTYuMTQtMTIuMTgtMjMuOTgtMTUuOTYtMTIuNzktNi4xOC0yMS45Ni02LjExLTM0LjY1LDAtMy4wOCwxLjQ3LTYuMjQsMy4xNy05LjQyLDUuMTJoLS4wMWwtLjEzLjA5Yy0zLjg2LDIuMzgtNy43Niw1LjE0LTExLjU2LDguMy0xLjQ4LDEuMjEtMi45NCwyLjUxLTQuMzcsMy44Ni0yLjc1LDIuNTktNS40LDQuOTQtNy45NSw3LjEtNy4wOSwxLjYyLTE0LjMzLDMuMjctMjEuNDUsNC45MWwuMSwxLjA2YzYuNTEtMS4zOCwxMi43My0yLjYzLDE4LjY0LTMuNzQtNy43Miw2LjI1LTE0LjM2LDEwLjUyLTE5LjY1LDEzLjQxLTEyLTMuNC0yMi4wNS0zLjQ0LTI3LjU5LTMuMDYsOC43Ny0yLjA0LDE4LjUtNC4yOSwyOC40NS02LjU5bC0uMS0xLjA2QzE2LjI1LDM3Ljc4LDEuNDksNDIuMTQsMS40OSw0Mi4xNGMtLjI3LjA0LS40NS4wOS0uNDUuMDktNi4xOCwyLjA4LDE3LjI4LDQuMjEsMTcuMjgsNC4yMSwwLDAsMi4zNC40Niw2LjYxLDIuMjctMy41NSwxLjQyLTUuNDksMS44MS01LjQ5LDEuODEsMCwwLTIzLjQ2LDIuMTItMTcuMjgsNC4yMSwwLDAsLjE2LjA0LjQ1LjA5LDAsMCw4Ljk0LDIuNjQsMjEuMjksNS41OS0yLjg5LDEuMDktNC40NiwxLjQtNC40NiwxLjQsMCwwLTIzLjQ2LDIuMTItMTcuMjgsNC4yMSwwLDAsLjE2LjA0LjQ1LjA5LDAsMCwxNC43NSw0LjM2LDMyLjU0LDguMTNsLjEtMS4wNmMtOS45Ni0yLjMtMTkuNjgtNC41NS0yOC40NC02LjU5LDUuNzYuNDEsMTYuNDEuMzUsMjkuMDUtMy40OCw1LjkxLDEuMzYsMTEuOSwyLjczLDE3LjgyLDQuMDgsMi44LDIuMzQsNS43Myw0LjkyLDguNzgsNy43OS41MS40OCwxLjAxLjk1LDEuNTIsMS40MSwxLjEyLDEsMi4yNSwxLjk2LDMuMzgsMi44OS05LjY3LTEuNTgtMjAuMzctMy42Mi0zMS45Ny02LjA4bC0uMSwxLjA2YzEyLjIxLDIuODEsMjQuNzYsNS42NywzNi4zMiw4LjMsNS40Nyw0LDExLjAyLDcuMjIsMTYuMzUsOS43OSwxMi43OSw2LjE4LDIxLjk2LDYuMTEsMzQuNjUsMCwzLjA4LTEuNDcsNi4yNC0zLjE3LDkuNDItNS4xMmguMDFsLjEzLS4wOWMxLjkzLTEuMTksMy44Ny0yLjQ4LDUuOC0zLjg2LDEyLjQyLTIuODIsMjYuMTktNS45NSwzOS41NC05LjAzbC0uMS0xLjA2Yy0xMi43NSwyLjctMjQuMzksNC45LTM0Ljc5LDYuNTQuMzctLjMuNzUtLjU5LDEuMTItLjg5LDEuNDgtMS4yMSwyLjk0LTIuNTEsNC4zNy0zLjg2LDIuNzUtMi41OSw1LjQtNC45NCw3Ljk1LTcuMSw2LjktMS41NywxMy45NS0zLjE5LDIwLjg4LTQuNzgsMTIuNjUsMy44MywyMy4zLDMuODgsMjkuMDcsMy40OC04Ljc3LDIuMDQtMTguNSw0LjI5LTI4LjQ1LDYuNTlsLjEsMS4wNmMxNy43OS0zLjc3LDMyLjU1LTguMTMsMzIuNTUtOC4xMy4yNy0uMDQuNDUtLjA5LjQ1LS4wOSw2LjE4LTIuMDgtMTcuMjgtNC4yMS0xNy4yOC00LjIxWk00NS42Myw0OC4xOGMtLjMyLjIzLS42My40NC0uOTQuNjYtLjEtLjA0LS4xOS0uMDktLjI5LS4xMy40MS0uMTcuODItLjM1LDEuMjMtLjUzWk0yNS43Miw1OS42N2MtNi41OS0xLjUzLTEyLjk4LTMuMDEtMTguOTEtNC4zOSw1LjMxLjM3LDE0Ljc2LjM2LDI2LjEtMi42NC45OS41NSwyLjA0LDEuMTcsMy4xMSwxLjgxLTQuMTcsMi40NC03LjYzLDQuMS0xMC4zMSw1LjIxWk0zNy45NCw2Mi40MmMyLjExLS43LDQuMjgtMS41MSw2LjQ4LTIuNDQsMi4xMywxLjUyLDQuMzYsMy4yMSw2LjcsNS4wOS00LjI0LS44MS04LjY0LTEuNy0xMy4xOC0yLjY1Wk03MS41Myw2My4yNWMtNC45NS0yLjE1LTkuODYtNC43Ny0xNC43LTcuODctLjUtLjMyLTEtLjYyLTEuNS0uOTMuODctLjUyLDEuNzUtMS4wNSwyLjYzLTEuNjIsMi40Ni0xLjU4LDQuOTUtMy4wNCw3LjQ1LTQuMzYsMy40OS0xLjg3LDcuMDEtMy41LDEwLjU2LTQuODgtLjg4LDguMjksMS43OSwxNi45NSw2Ljc2LDIzLjY2LTMuNzUtMS4wNy03LjQ4LTIuNC0xMS4xOS00LjAxWk0xMTguODYsNjkuMjljLS4yNy4wNS0uNTUuMS0uODIuMTUtOS4zNCwxLjUtMTguNzQsMS4zNC0yOC4wNy0uNDUtOC44Ny02LjE4LTEwLjg2LTE4LjM4LTYuNTItMjcuOSwzLjM5LS45OCw2Ljc5LTEuNzUsMTAuMjEtMi4yOCwxMi4xMS0xLjk0LDI0LjMyLTEuMTEsMzYuMzUsMi40OCwxLjQxLDIuNjIsMi4yNCw1LjU4LDIuMjgsOC44Ni0uMTQsOC44LTUuODksMTUuMzktMTMuNDIsMTkuMTVaTTE1My43NCw1NS4zOGMtMi40NiwxLjU4LTQuOTUsMy4wNC03LjQ1LDQuMzYtNS40MywyLjkyLTEwLjk0LDUuMjItMTYuNSw2Ljk0LDIuMjgtNC42MywzLjU3LTEwLjIxLDMuNDctMTYuNTUuMDgtMi43Mi0uMTUtNS40Mi0uNjQtOC4wNCwyLjUzLjg0LDUuMDQsMS43OSw3LjU1LDIuODcsNC45NSwyLjE1LDkuODYsNC43NywxNC43LDcuODcuNS4zMiwxLC42MiwxLjUuOTMtLjg3LjUyLTEuNzUsMS4wNS0yLjYzLDEuNjJaTTE2Ny4yOSw0OC4yM3MwLDAtLjAxLDBjLS4wMSwwLS4wMy0uMDItLjA0LS4wMy4wMiwwLC4wMy4wMi4wNS4wMlpNMTU4Ljc3LDY1LjYzYzIuOS0yLjM1LDUuNjUtNC40Miw4LjIzLTYuMjQuMTYuMDcuMzIuMTUuNDcuMjIsMi41MywxLjEsNSwyLjAyLDcuNDEsMi44Mi01LjU5LDEuMTctMTAuOTcsMi4yNC0xNi4xMSwzLjJaTTE3NS42Nyw1My43N2MuOTUtLjU2LDEuODctMS4wOCwyLjc1LTEuNTYsMTIsMy40LDIyLjA1LDMuNDQsMjcuNTksMy4wNi01Ljk0LDEuMzgtMTIuMzIsMi44Ni0xOC45MSw0LjM5LTIuOTEtMS4yMS02Ljc2LTMuMDgtMTEuNDMtNS44OVoiLz4KICA8L2c+Cjwvc3ZnPgo=`;

const GORGONE_LOGO_WHITE = `data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iQ2FscXVlXzIiIGRhdGEtbmFtZT0iQ2FscXVlIDIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDIxMS42OSA5Ni45NCI+CiAgPGRlZnM+CiAgICA8c3R5bGU+CiAgICAgIC5jbHMtMSB7CiAgICAgICAgZmlsbDogI2ZmZmZmZjsKICAgICAgfQogICAgPC9zdHlsZT4KICA8L2RlZnM+CiAgPGcgaWQ9IkNhbHF1ZV8xLTIiIGRhdGEtbmFtZT0iQ2FscXVlIDEiPgogICAgPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTkzLjM4LDYxLjc5cy0xLjU3LS4zMi00LjQ2LTEuNDFjMTIuMzUtMi45NSwyMS4yOS01LjU5LDIxLjI5LTUuNTkuMjctLjA0LjQ1LS4wOS40NS0uMDksNi4xOC0yLjA4LTE3LjI4LTQuMjEtMTcuMjgtNC4yMSwwLDAtMi4zNC0uNDYtNi42MS0yLjI3LDMuNTUtMS40Miw1LjQ5LTEuODEsNS40OS0xLjgxLDAsMCwyMy40Ni0yLjEyLDE3LjI4LTQuMjEsMCwwLS4xNi0uMDQtLjQ1LS4wOSwwLDAtMTQuNzUtNC4zNi0zMi41NC04LjEzbC0uMSwxLjA2YzkuOTYsMi4zLDE5LjY4LDQuNTUsMjguNDQsNi41OS01LjMxLS4zNy0xNC43Ni0uMzYtMjYuMSwyLjY0LTMuMDQtMS42OS02LjUtMy44My0xMC4zNC02LjUyLTIuNDctMS43My01LjEtMy43LTcuODYtNS45Miw1LjA0Ljk3LDEwLjI4LDIuMDMsMTUuNzMsMy4xOGwuMS0xLjA2Yy02LjEtMS40MS0xMi4yOS0yLjgyLTE4LjM5LTQuMjItMi44LTIuMzQtNS43My00LjkyLTguNzgtNy43OS0uNTEtLjQ4LTEuMDEtLjk1LTEuNTItMS40MS03LjgyLTcuMDItMTYuMTQtMTIuMTgtMjMuOTgtMTUuOTYtMTIuNzktNi4xOC0yMS45Ni02LjExLTM0LjY1LDAtMy4wOCwxLjQ3LTYuMjQsMy4xNy05LjQyLDUuMTJoLS4wMWwtLjEzLjA5Yy0zLjg2LDIuMzgtNy43Niw1LjE0LTExLjU2LDguMy0xLjQ4LDEuMjEtMi45NCwyLjUxLTQuMzcsMy44Ni0yLjc1LDIuNTktNS40LDQuOTQtNy45NSw3LjEtNy4wOSwxLjYyLTE0LjMzLDMuMjctMjEuNDUsNC45MWwuMSwxLjA2YzYuNTEtMS4zOCwxMi43My0yLjYzLDE4LjY0LTMuNzQtNy43Miw2LjI1LTE0LjM2LDEwLjUyLTE5LjY1LDEzLjQxLTEyLTMuNC0yMi4wNS0zLjQ0LTI3LjU5LTMuMDYsOC43Ny0yLjA0LDE4LjUtNC4yOSwyOC40NS02LjU5bC0uMS0xLjA2QzE2LjI1LDM3Ljc4LDEuNDksNDIuMTQsMS40OSw0Mi4xNGMtLjI3LjA0LS40NS4wOS0uNDUuMDktNi4xOCwyLjA4LDE3LjI4LDQuMjEsMTcuMjgsNC4yMSwwLDAsMi4zNC40Niw2LjYxLDIuMjctMy41NSwxLjQyLTUuNDksMS44MS01LjQ5LDEuODEsMCwwLTIzLjQ2LDIuMTItMTcuMjgsNC4yMSwwLDAsLjE2LjA0LjQ1LjA5LDAsMCw4Ljk0LDIuNjQsMjEuMjksNS41OS0yLjg5LDEuMDktNC40NiwxLjQtNC40NiwxLjQsMCwwLTIzLjQ2LDIuMTItMTcuMjgsNC4yMSwwLDAsLjE2LjA0LjQ1LjA5LDAsMCwxNC43NSw0LjM2LDMyLjU0LDguMTNsLjEtMS4wNmMtOS45Ni0yLjMtMTkuNjgtNC41NS0yOC40NC02LjU5LDUuNzYuNDEsMTYuNDEuMzUsMjkuMDUtMy40OCw1LjkxLDEuMzYsMTEuOSwyLjczLDE3LjgyLDQuMDgsMi44LDIuMzQsNS43Myw0LjkyLDguNzgsNy43OS41MS40OCwxLjAxLjk1LDEuNTIsMS40MSwxLjEyLDEsMi4yNSwxLjk2LDMuMzgsMi44OS05LjY3LTEuNTgtMjAuMzctMy42Mi0zMS45Ny02LjA4bC0uMSwxLjA2YzEyLjIxLDIuODEsMjQuNzYsNS42NywzNi4zMiw4LjMsNS40Nyw0LDExLjAyLDcuMjIsMTYuMzUsOS43OSwxMi43OSw2LjE4LDIxLjk2LDYuMTEsMzQuNjUsMCwzLjA4LTEuNDcsNi4yNC0zLjE3LDkuNDItNS4xMmguMDFsLjEzLS4wOWMxLjkzLTEuMTksMy44Ny0yLjQ4LDUuOC0zLjg2LDEyLjQyLTIuODIsMjYuMTktNS45NSwzOS41NC05LjAzbC0uMS0xLjA2Yy0xMi43NSwyLjctMjQuMzksNC45LTM0Ljc5LDYuNTQuMzctLjMuNzUtLjU5LDEuMTItLjg5LDEuNDgtMS4yMSwyLjk0LTIuNTEsNC4zNy0zLjg2LDIuNzUtMi41OSw1LjQtNC45NCw3Ljk1LTcuMSw2LjktMS41NywxMy45NS0zLjE5LDIwLjg4LTQuNzgsMTIuNjUsMy44MywyMy4zLDMuODgsMjkuMDcsMy40OC04Ljc3LDIuMDQtMTguNSw0LjI5LTI4LjQ1LDYuNTlsLjEsMS4wNmMxNy43OS0zLjc3LDMyLjU1LTguMTMsMzIuNTUtOC4xMy4yNy0uMDQuNDUtLjA5LjQ1LS4wOSw2LjE4LTIuMDgtMTcuMjgtNC4yMS0xNy4yOC00LjIxWk00NS42Myw0OC4xOGMtLjMyLjIzLS42My40NC0uOTQuNjYtLjEtLjA0LS4xOS0uMDktLjI5LS4xMy40MS0uMTcuODItLjM1LDEuMjMtLjUzWk0yNS43Miw1OS42N2MtNi41OS0xLjUzLTEyLjk4LTMuMDEtMTguOTEtNC4zOSw1LjMxLjM3LDE0Ljc2LjM2LDI2LjEtMi42NC45OS41NSwyLjA0LDEuMTcsMy4xMSwxLjgxLTQuMTcsMi40NC03LjYzLDQuMS0xMC4zMSw1LjIxWk0zNy45NCw2Mi40MmMyLjExLS43LDQuMjgtMS41MSw2LjQ4LTIuNDQsMi4xMywxLjUyLDQuMzYsMy4yMSw2LjcsNS4wOS00LjI0LS44MS04LjY0LTEuNy0xMy4xOC0yLjY1Wk03MS41Myw2My4yNWMtNC45NS0yLjE1LTkuODYtNC43Ny0xNC43LTcuODctLjUtLjMyLTEtLjYyLTEuNS0uOTMuODctLjUyLDEuNzUtMS4wNSwyLjYzLTEuNjIsMi40Ni0xLjU4LDQuOTUtMy4wNCw3LjQ1LTQuMzYsMy40OS0xLjg3LDcuMDEtMy41LDEwLjU2LTQuODgtLjg4LDguMjksMS43OSwxNi45NSw2Ljc2LDIzLjY2LTMuNzUtMS4wNy03LjQ4LTIuNC0xMS4xOS00LjAxWk0xMTguODYsNjkuMjljLS4yNy4wNS0uNTUuMS0uODIuMTUtOS4zNCwxLjUtMTguNzQsMS4zNC0yOC4wNy0uNDUtOC44Ny02LjE4LTEwLjg2LTE4LjM4LTYuNTItMjcuOSwzLjM5LS45OCw2Ljc5LTEuNzUsMTAuMjEtMi4yOCwxMi4xMS0xLjk0LDI0LjMyLTEuMTEsMzYuMzUsMi40OCwxLjQxLDIuNjIsMi4yNCw1LjU4LDIuMjgsOC44Ni0uMTQsOC44LTUuODksMTUuMzktMTMuNDIsMTkuMTVaTTE1My43NCw1NS4zOGMtMi40NiwxLjU4LTQuOTUsMy4wNC03LjQ1LDQuMzYtNS40MywyLjkyLTEwLjk0LDUuMjItMTYuNSw2Ljk0LDIuMjgtNC42MywzLjU3LTEwLjIxLDMuNDctMTYuNTUuMDgtMi43Mi0uMTUtNS40Mi0uNjQtOC4wNCwyLjUzLjg0LDUuMDQsMS43OSw3LjU1LDIuODcsNC45NSwyLjE1LDkuODYsNC43NywxNC43LDcuODcuNS4zMiwxLC42MiwxLjUuOTMtLjg3LjUyLTEuNzUsMS4wNS0yLjYzLDEuNjJaTTE2Ny4yOSw0OC4yM3MwLDAtLjAxLDBjLS4wMSwwLS4wMy0uMDItLjA0LS4wMy4wMiwwLC4wMy4wMi4wNS4wMlpNMTU4Ljc3LDY1LjYzYzIuOS0yLjM1LDUuNjUtNC40Miw4LjIzLTYuMjQuMTYuMDcuMzIuMTUuNDcuMjIsMi41MywxLjEsNSwyLjAyLDcuNDEsMi44Mi01LjU5LDEuMTctMTAuOTcsMi4yNC0xNi4xMSwzLjJaTTE3NS42Nyw1My43N2MuOTUtLjU2LDEuODctMS4wOCwyLjc1LTEuNTYsMTIsMy40LDIyLjA1LDMuNDQsMjcuNTksMy4wNi01Ljk0LDEuMzgtMTIuMzIsMi44Ni0xOC45MSw0LjM5LTIuOTEtMS4yMS02Ljc2LTMuMDgtMTEuNDMtNS44OVoiLz4KICA8L2c+Cjwvc3ZnPgo=`;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert SVG data URL to PNG for jsPDF compatibility
 */
async function svgToPng(svgDataUrl: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = svgDataUrl;
  });
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Export a report to PDF as a single continuous page (no page breaks)
 * 
 * The PDF will be as tall as needed to fit all content.
 * Header at top, content in middle, footer at bottom.
 */
export async function exportReportToPDF({
  report,
  contentElement,
  theme = "light",
}: PDFExportOptions): Promise<void> {
  const isDark = theme === "dark";

  // Theme colors
  const colors = {
    background: isDark ? "#0a0a0a" : "#ffffff",
    text: isDark ? "#fafafa" : "#1a1a1a",
    muted: isDark ? "#a1a1aa" : "#71717a",
    border: isDark ? "#27272a" : "#e4e4e7",
    confidential: isDark ? "#ef4444" : "#b91c1c",
  };

  // Layout constants (in mm)
  const margin = 20;
  const headerHeight = 30;
  const footerHeight = 20;
  const pageWidth = 210; // A4 width

  try {
    // 1. Convert logo to PNG
    const logoSvg = isDark ? GORGONE_LOGO_WHITE : GORGONE_LOGO_BLACK;
    const logoPng = await svgToPng(logoSvg, 212, 97);

    // 2. Capture content as image
    const contentImage = await domToPng(contentElement, {
      scale: 2,
      backgroundColor: colors.background,
      filter: (node: Node) => {
        if (node instanceof HTMLElement) {
          return node.getAttribute("data-pdf-exclude") !== "true";
        }
        return true;
      },
    });

    // 3. Get image dimensions
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = contentImage;
    });

    // 4. Calculate PDF dimensions
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (img.height * contentWidth) / img.width;
    const totalHeight = headerHeight + contentHeight + footerHeight;

    // 5. Create PDF with custom height
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [pageWidth, totalHeight],
    });

    // 6. Add background (for dark mode)
    if (isDark) {
      const bg = hexToRgb(colors.background);
      pdf.setFillColor(bg.r, bg.g, bg.b);
      pdf.rect(0, 0, pageWidth, totalHeight, "F");
    }

    // 7. Add header
    const textColor = hexToRgb(colors.text);
    const mutedColor = hexToRgb(colors.muted);
    const borderColor = hexToRgb(colors.border);

    // Logo
    pdf.addImage(logoPng, "PNG", margin, 10, 26, 12);

    // Title
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(textColor.r, textColor.g, textColor.b);
    pdf.text("GORGONE", margin + 30, 17);

    // Subtitle
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(mutedColor.r, mutedColor.g, mutedColor.b);
    pdf.text("Intelligence Report", margin + 30, 21);

    // Date
    const date = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    pdf.text(date, pageWidth - margin, 17, { align: "right" });

    // Header separator
    pdf.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    pdf.setLineWidth(0.3);
    pdf.line(margin, 26, pageWidth - margin, 26);

    // 8. Add content image
    pdf.addImage(contentImage, "PNG", margin, headerHeight, contentWidth, contentHeight);

    // 9. Add footer
    const footerY = totalHeight - 10;

    // Footer separator
    pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    // Confidential
    const confColor = hexToRgb(colors.confidential);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(confColor.r, confColor.g, confColor.b);
    pdf.text("CONFIDENTIAL", pageWidth / 2, footerY, { align: "center" });

    // 10. Save PDF
    const filename = `${report.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`;
    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF");
  }
}
