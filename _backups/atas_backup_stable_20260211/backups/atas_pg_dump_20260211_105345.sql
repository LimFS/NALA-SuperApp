--
-- PostgreSQL database dump
--

\restrict vUB0WCoWef93BTxE3NAvtg6ip6Zw3QpwTIE0PGjfEBNcTMHQAoaI2ngh1nzeFC3

-- Dumped from database version 14.20 (Homebrew)
-- Dumped by pg_dump version 14.20 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: course_config_history; Type: TABLE; Schema: public; Owner: limfunsiong
--

CREATE TABLE public.course_config_history (
    id integer NOT NULL,
    course_code text,
    academic_year text,
    semester text,
    prompt_template text,
    model_config jsonb,
    api_key text,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.course_config_history OWNER TO limfunsiong;

--
-- Name: course_config_history_id_seq; Type: SEQUENCE; Schema: public; Owner: limfunsiong
--

CREATE SEQUENCE public.course_config_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.course_config_history_id_seq OWNER TO limfunsiong;

--
-- Name: course_config_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: limfunsiong
--

ALTER SEQUENCE public.course_config_history_id_seq OWNED BY public.course_config_history.id;


--
-- Name: course_offerings; Type: TABLE; Schema: public; Owner: limfunsiong
--

CREATE TABLE public.course_offerings (
    course_code text NOT NULL,
    academic_year text NOT NULL,
    semester text NOT NULL,
    icon_url text,
    prompt_template text,
    model_config jsonb,
    api_key text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active integer DEFAULT 1
);


ALTER TABLE public.course_offerings OWNER TO limfunsiong;

--
-- Name: grading_traces; Type: TABLE; Schema: public; Owner: limfunsiong
--

CREATE TABLE public.grading_traces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    udi text NOT NULL,
    agent_id text DEFAULT 'ANTI_GRAVITY'::text,
    course_code text NOT NULL,
    academic_year text,
    semester text,
    question_id text,
    question_version_uuid uuid,
    set_id integer,
    input_bundle jsonb,
    score numeric,
    feedback text,
    rubric_breakdown jsonb,
    trace_log jsonb,
    latency_ms integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.grading_traces OWNER TO limfunsiong;

--
-- Name: question_sets; Type: TABLE; Schema: public; Owner: limfunsiong
--

CREATE TABLE public.question_sets (
    id integer NOT NULL,
    course_code text NOT NULL,
    academic_year text NOT NULL,
    semester text NOT NULL,
    set_id integer NOT NULL,
    name text,
    sequence_order integer DEFAULT 0,
    is_visible boolean DEFAULT true,
    difficulty_id uuid,
    difficulty_name text,
    created_by text,
    updated_by text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.question_sets OWNER TO limfunsiong;

--
-- Name: question_sets_id_seq; Type: SEQUENCE; Schema: public; Owner: limfunsiong
--

CREATE SEQUENCE public.question_sets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.question_sets_id_seq OWNER TO limfunsiong;

--
-- Name: question_sets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: limfunsiong
--

ALTER SEQUENCE public.question_sets_id_seq OWNED BY public.question_sets.id;


--
-- Name: question_versions; Type: TABLE; Schema: public; Owner: limfunsiong
--

CREATE TABLE public.question_versions (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id text NOT NULL,
    question_text text,
    type text DEFAULT 'text'::text,
    options text,
    answer_key text,
    hint text,
    explanation text,
    media text,
    difficulty integer,
    context text,
    max_score numeric DEFAULT 10.0,
    rubrics jsonb,
    version_number integer DEFAULT 1 NOT NULL,
    is_visible boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by text
);


ALTER TABLE public.question_versions OWNER TO limfunsiong;

--
-- Name: questions; Type: TABLE; Schema: public; Owner: limfunsiong
--

CREATE TABLE public.questions (
    id text NOT NULL,
    question_id text,
    course_code text,
    academic_year text,
    semester text,
    set_id integer,
    question_set_name text,
    deleted_at timestamp without time zone,
    is_visible boolean DEFAULT true
);


ALTER TABLE public.questions OWNER TO limfunsiong;

--
-- Name: student_progress; Type: TABLE; Schema: public; Owner: limfunsiong
--

CREATE TABLE public.student_progress (
    id integer NOT NULL,
    user_id text,
    course_code text,
    academic_year text,
    semester text,
    current_set_id integer,
    current_difficulty text,
    last_active_question_id text,
    data jsonb,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.student_progress OWNER TO limfunsiong;

--
-- Name: student_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: limfunsiong
--

CREATE SEQUENCE public.student_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.student_progress_id_seq OWNER TO limfunsiong;

--
-- Name: student_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: limfunsiong
--

ALTER SEQUENCE public.student_progress_id_seq OWNED BY public.student_progress.id;


--
-- Name: student_question_attempts; Type: TABLE; Schema: public; Owner: limfunsiong
--

CREATE TABLE public.student_question_attempts (
    id integer NOT NULL,
    user_id text,
    question_id text,
    is_correct boolean,
    attempt_count integer DEFAULT 1,
    last_attempt_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.student_question_attempts OWNER TO limfunsiong;

--
-- Name: student_question_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: limfunsiong
--

CREATE SEQUENCE public.student_question_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.student_question_attempts_id_seq OWNER TO limfunsiong;

--
-- Name: student_question_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: limfunsiong
--

ALTER SEQUENCE public.student_question_attempts_id_seq OWNED BY public.student_question_attempts.id;


--
-- Name: taxonomies; Type: TABLE; Schema: public; Owner: limfunsiong
--

CREATE TABLE public.taxonomies (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    taxonomy_name text NOT NULL,
    taxonomy_max_level integer DEFAULT 6,
    taxonomy_description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.taxonomies OWNER TO limfunsiong;

--
-- Name: user_access_roles; Type: TABLE; Schema: public; Owner: limfunsiong
--

CREATE TABLE public.user_access_roles (
    id integer NOT NULL,
    user_id text,
    email text,
    course_code text NOT NULL,
    academic_year text NOT NULL,
    semester text NOT NULL,
    role text DEFAULT 'student'::text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_access_roles OWNER TO limfunsiong;

--
-- Name: user_access_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: limfunsiong
--

CREATE SEQUENCE public.user_access_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_access_roles_id_seq OWNER TO limfunsiong;

--
-- Name: user_access_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: limfunsiong
--

ALTER SEQUENCE public.user_access_roles_id_seq OWNED BY public.user_access_roles.id;


--
-- Name: course_config_history id; Type: DEFAULT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.course_config_history ALTER COLUMN id SET DEFAULT nextval('public.course_config_history_id_seq'::regclass);


--
-- Name: question_sets id; Type: DEFAULT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.question_sets ALTER COLUMN id SET DEFAULT nextval('public.question_sets_id_seq'::regclass);


--
-- Name: student_progress id; Type: DEFAULT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.student_progress ALTER COLUMN id SET DEFAULT nextval('public.student_progress_id_seq'::regclass);


--
-- Name: student_question_attempts id; Type: DEFAULT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.student_question_attempts ALTER COLUMN id SET DEFAULT nextval('public.student_question_attempts_id_seq'::regclass);


--
-- Name: user_access_roles id; Type: DEFAULT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.user_access_roles ALTER COLUMN id SET DEFAULT nextval('public.user_access_roles_id_seq'::regclass);


--
-- Data for Name: course_config_history; Type: TABLE DATA; Schema: public; Owner: limfunsiong
--

COPY public.course_config_history (id, course_code, academic_year, semester, prompt_template, model_config, api_key, changed_at) FROM stdin;
\.


--
-- Data for Name: course_offerings; Type: TABLE DATA; Schema: public; Owner: limfunsiong
--

COPY public.course_offerings (course_code, academic_year, semester, icon_url, prompt_template, model_config, api_key, created_at, is_active) FROM stdin;
MH1810	AY2025	Semester 2	/assets/uploads/mh1810_math.png	You are an AI Tutor for Engineering Mathematics. Analyze the student answer for the given question. \n\nQuestion: {{questionText}}\nCorrect Answer: {{answerKey}}\nStudent Answer: {{studentAnswer}}\n\nYour task:\n1. determine if the answer is conceptually correct (even if format differs slightly). \n2. Provide a helpful explanation if correct.\n3. Give a hint that points out the students' misconception if incorrect. You can reference this policy where available: {{hintPolicy}}. DO NOT give the correct answer.\n\nRespond STRICTLY in JSON format:\n{\n  "correct": boolean,\n  "explanation": "string"\n}	\N		2026-02-11 10:51:57.628855	1
\.


--
-- Data for Name: grading_traces; Type: TABLE DATA; Schema: public; Owner: limfunsiong
--

COPY public.grading_traces (id, user_id, udi, agent_id, course_code, academic_year, semester, question_id, question_version_uuid, set_id, input_bundle, score, feedback, rubric_breakdown, trace_log, latency_ms, created_at) FROM stdin;
\.


--
-- Data for Name: question_sets; Type: TABLE DATA; Schema: public; Owner: limfunsiong
--

COPY public.question_sets (id, course_code, academic_year, semester, set_id, name, sequence_order, is_visible, difficulty_id, difficulty_name, created_by, updated_by, created_at, updated_at, deleted_at) FROM stdin;
4	MH1810	AY2025	Semester 2	1	Module 1: Fundamentals	1	t	0d0ccc1d-0b00-4bf4-9e90-4069d1460fca	Bloom's Taxonomy	\N	\N	2026-02-11 10:51:57.628855	2026-02-11 10:51:57.628855	\N
5	MH1810	AY2025	Semester 2	2	Module 2: Vectors & Linear Algebra	2	t	0d0ccc1d-0b00-4bf4-9e90-4069d1460fca	Bloom's Taxonomy	\N	\N	2026-02-11 10:51:57.628855	2026-02-11 10:51:57.628855	\N
6	MH1810	AY2025	Semester 2	3	Module 3: Differential Equations	3	f	0d0ccc1d-0b00-4bf4-9e90-4069d1460fca	Bloom's Taxonomy	\N	uuid-hal	2026-02-11 10:51:57.628855	2026-02-11 10:51:57.628855	\N
\.


--
-- Data for Name: question_versions; Type: TABLE DATA; Schema: public; Owner: limfunsiong
--

COPY public.question_versions (uuid, question_id, question_text, type, options, answer_key, hint, explanation, media, difficulty, context, max_score, rubrics, version_number, is_visible, created_at, created_by) FROM stdin;
cf82b76e-e123-4b08-a60c-6f908dfad196	q2	State the Power Rule for differentiation.	mcq	["nx^(n-1)","x^n/n","nx^n","n^x"]	["nx^(n-1)"]	If you are trying to find the derivative of \\(x^{10}\\), you would bring the 10 to the front and then "knock" the exponent down from 10 to 9.	The power rule is a fundamental shortcut in calculus used to find the derivative of a variable raised to a power. It states that for any function \\(f(x)=x^{n}\\), where \\(n\\) is any real number, the derivative is found by multiplying the expression by the exponent and then reducing the exponent by one.	{}	1	Differentiation	10.0	\N	1	t	2026-02-11 10:51:57.628855	\N
76126752-7bbd-4b64-9ce6-675c85989ab4	q3	Explain why the function shown in the graph is discontinuous at x=0.	text	[]	[]	Describe in terms of limits	\N	{"type":"image","url":"/assets/uploads/discontinuity_jump.png"}	2	Rational Functions and Negative Exponents	10.0	\N	1	t	2026-02-11 10:51:57.628855	\N
bfe64840-5508-43f2-8bfe-70dcdec5ba83	q4	Calculate the average velocity between t=0 and t=5s based on the displacement graph.	text	[]	[]	\N	\N	{"type":"image","url":"/mh1810/assets/uploads/file-1770692419967-501929388.png"}	3	\N	10.0	\N	1	t	2026-02-11 10:51:57.628855	\N
9e5c43a2-11d1-49cc-8079-68571d88e67e	q5	Which step in the following integration by parts is incorrect?	mcq	["Step 1: Choose u=x","Step 2: dv=sin(x)dx","Step 3: v=cos(x)","Step 4: Answer is -xcos(x) + sin(x)"]	["Step 3: v=cos(x)"]	\N	\N	\N	4	\N	10.0	\N	1	t	2026-02-11 10:51:57.628855	\N
7008c251-113f-4146-b871-7a2a398e20ea	q6	Critique the following statement: "Every continuous function is differentiable."	text	\N	\N	\N	\N	\N	5	\N	10.0	\N	1	t	2026-02-11 10:51:57.628855	\N
e6328fa4-689e-4553-8f31-cfd8ab943f1f	q7	Construct a function f(x) that is continuous everywhere but not differentiable at x=2 and x=5.	text	\N	\N	\N	\N	\N	6	\N	10.0	\N	1	t	2026-02-11 10:51:57.628855	\N
e6eefec1-fb20-423f-a27c-ada9d5d20399	q1	Find the derivative of f(x) = x^2.	text	\N	\N	\N	\N	\N	1	Basic differentiation rules.	10.0	\N	1	t	2026-02-11 10:51:57.628855	\N
55d14457-316e-4586-bcb5-5626bab63f16	q12	Find the cross product of i and j.	mcq	["k","-k","0","1"]	["k"]	\N	\N	\N	2	\N	10.0	\N	1	t	2026-02-11 10:51:57.628855	\N
0af5155b-e6e6-443c-a8f0-66ee5cea9fda	q11	Compute the dot product of (1, 2) and (3, 4).	text	\N	\N	\N	\N	\N	2	\N	10.0	\N	1	t	2026-02-11 10:51:57.628855	\N
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: limfunsiong
--

COPY public.questions (id, question_id, course_code, academic_year, semester, set_id, question_set_name, deleted_at, is_visible) FROM stdin;
q2	Q2	MH1810	AY2025	Semester 2	1	\N	\N	t
q3	Q3	MH1810	AY2025	Semester 2	1	\N	\N	t
q4	Q4	MH1810	AY2025	Semester 2	1	\N	\N	t
q5	Q5	MH1810	AY2025	Semester 2	1	\N	\N	t
q6	Q6	MH1810	AY2025	Semester 2	1	\N	\N	t
q7	Q7	MH1810	AY2025	Semester 2	1	\N	\N	t
q1	Q1	MH1810	AY2025	Semester 2	1	\N	\N	t
q12	Q12	MH1810	AY2025	Semester 2	2	\N	\N	t
q11	Q11	MH1810	AY2025	Semester 2	2	\N	\N	t
\.


--
-- Data for Name: student_progress; Type: TABLE DATA; Schema: public; Owner: limfunsiong
--

COPY public.student_progress (id, user_id, course_code, academic_year, semester, current_set_id, current_difficulty, last_active_question_id, data, updated_at) FROM stdin;
1	uuid-del	MH1810	AY2025	Semester 2	1	2	\N	{"timestamp": 1770775893208, "isComplete": false, "currentSetId": 1, "questionCount": 2, "currentDifficulty": 2, "currentQuestionIndex": 2, "showModuleTransition": false}	2026-02-11 02:11:33
\.


--
-- Data for Name: student_question_attempts; Type: TABLE DATA; Schema: public; Owner: limfunsiong
--

COPY public.student_question_attempts (id, user_id, question_id, is_correct, attempt_count, last_attempt_at) FROM stdin;
\.


--
-- Data for Name: taxonomies; Type: TABLE DATA; Schema: public; Owner: limfunsiong
--

COPY public.taxonomies (uuid, taxonomy_name, taxonomy_max_level, taxonomy_description, created_at) FROM stdin;
0d0ccc1d-0b00-4bf4-9e90-4069d1460fca	Bloom's Taxonomy	6	Standard cognitive levels: Remember, Understand, Apply, Analyze, Evaluate, Create	2026-02-11 10:33:14.283219
a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11	SOLO Taxonomy	5	Structure of the Observed Learning Outcome	2026-02-11 10:33:14.283219
7a10373e-60ce-4da0-9723-4b9370cf5f06	SOLO Taxonomy	5	Structure of the Observed Learning Outcome - a model that describes levels of increasing complexity in student's understanding of subjects.	2026-02-11 00:44:03
\.


--
-- Data for Name: user_access_roles; Type: TABLE DATA; Schema: public; Owner: limfunsiong
--

COPY public.user_access_roles (id, user_id, email, course_code, academic_year, semester, role, created_at) FROM stdin;
1	uuid-del	\N	MH1810	AY2025/26	Semester 2	student	2026-02-11 10:42:39.818668
2	uuid-hal	\N	MH1810	AY2025/26	Semester 2	faculty	2026-02-11 10:42:39.818668
5	uuid-hal	2ed325e3b5129f58fe682b3ef79e1b74:010611bab1445e341796456126992483	MH1810	AY2025	Semester 2	faculty	2026-02-11 10:51:57.628855
6	uuid-del	e20a17dca189d1aeadf8db7b6fd1dd18:765ce6af2a9d58132427451453188e92	MH1810	2024	2	student	2026-02-11 10:51:57.628855
\.


--
-- Name: course_config_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: limfunsiong
--

SELECT pg_catalog.setval('public.course_config_history_id_seq', 1, false);


--
-- Name: question_sets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: limfunsiong
--

SELECT pg_catalog.setval('public.question_sets_id_seq', 6, true);


--
-- Name: student_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: limfunsiong
--

SELECT pg_catalog.setval('public.student_progress_id_seq', 1, true);


--
-- Name: student_question_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: limfunsiong
--

SELECT pg_catalog.setval('public.student_question_attempts_id_seq', 1, false);


--
-- Name: user_access_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: limfunsiong
--

SELECT pg_catalog.setval('public.user_access_roles_id_seq', 6, true);


--
-- Name: course_config_history course_config_history_pkey; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.course_config_history
    ADD CONSTRAINT course_config_history_pkey PRIMARY KEY (id);


--
-- Name: course_offerings course_offerings_pkey; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.course_offerings
    ADD CONSTRAINT course_offerings_pkey PRIMARY KEY (course_code, academic_year, semester);


--
-- Name: grading_traces grading_traces_pkey; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.grading_traces
    ADD CONSTRAINT grading_traces_pkey PRIMARY KEY (id);


--
-- Name: question_sets question_sets_course_code_academic_year_semester_set_id_key; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.question_sets
    ADD CONSTRAINT question_sets_course_code_academic_year_semester_set_id_key UNIQUE (course_code, academic_year, semester, set_id);


--
-- Name: question_sets question_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.question_sets
    ADD CONSTRAINT question_sets_pkey PRIMARY KEY (id);


--
-- Name: question_versions question_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.question_versions
    ADD CONSTRAINT question_versions_pkey PRIMARY KEY (uuid);


--
-- Name: question_versions question_versions_question_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.question_versions
    ADD CONSTRAINT question_versions_question_id_version_number_key UNIQUE (question_id, version_number);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: student_progress student_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_pkey PRIMARY KEY (id);


--
-- Name: student_progress student_progress_user_id_course_code_academic_year_semester_key; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_user_id_course_code_academic_year_semester_key UNIQUE (user_id, course_code, academic_year, semester);


--
-- Name: student_question_attempts student_question_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.student_question_attempts
    ADD CONSTRAINT student_question_attempts_pkey PRIMARY KEY (id);


--
-- Name: student_question_attempts student_question_attempts_user_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.student_question_attempts
    ADD CONSTRAINT student_question_attempts_user_id_question_id_key UNIQUE (user_id, question_id);


--
-- Name: taxonomies taxonomies_pkey; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.taxonomies
    ADD CONSTRAINT taxonomies_pkey PRIMARY KEY (uuid);


--
-- Name: user_access_roles user_access_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.user_access_roles
    ADD CONSTRAINT user_access_roles_pkey PRIMARY KEY (id);


--
-- Name: user_access_roles user_access_roles_user_id_course_code_academic_year_semeste_key; Type: CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.user_access_roles
    ADD CONSTRAINT user_access_roles_user_id_course_code_academic_year_semeste_key UNIQUE (user_id, course_code, academic_year, semester);


--
-- Name: grading_traces grading_traces_question_version_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.grading_traces
    ADD CONSTRAINT grading_traces_question_version_uuid_fkey FOREIGN KEY (question_version_uuid) REFERENCES public.question_versions(uuid);


--
-- Name: question_versions question_versions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.question_versions
    ADD CONSTRAINT question_versions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: questions questions_course_code_academic_year_semester_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: limfunsiong
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_course_code_academic_year_semester_set_id_fkey FOREIGN KEY (course_code, academic_year, semester, set_id) REFERENCES public.question_sets(course_code, academic_year, semester, set_id);


--
-- PostgreSQL database dump complete
--

\unrestrict vUB0WCoWef93BTxE3NAvtg6ip6Zw3QpwTIE0PGjfEBNcTMHQAoaI2ngh1nzeFC3

