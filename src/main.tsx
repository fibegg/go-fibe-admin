import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { Lock, Play, ShieldCheck, Wrench } from "lucide-react";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import {
	graphql,
	login,
	logout,
	type MaintenanceTask,
	type Session,
} from "./queries";

const queryClient = new QueryClient();

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<Shell />
		</QueryClientProvider>
	);
}

function Shell() {
	const session = useQuery({
		queryKey: ["session"],
		queryFn: fetchSession,
	});

	if (session.isLoading)
		return <main className="center">Loading admin...</main>;
	if (!session.data?.user) return <Login />;
	return <AdminConsole session={session.data as AuthenticatedSession} />;
}

function Login() {
	const qc = useQueryClient();
	const [email, setEmail] = useState("admin@example.com");
	const [password, setPassword] = useState("password");
	const mutation = useMutation({
		mutationFn: () => login(email, password),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["session"] }),
	});

	return (
		<main className="center">
			<section className="card loginCard">
				<ShieldCheck size={32} />
				<h1>Admin Console</h1>
				<p>Maintenance tasks and operational controls for this playground.</p>
				<label>
					Email
					<input
						value={email}
						onChange={(event) => setEmail(event.target.value)}
					/>
				</label>
				<label>
					Password
					<input
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
					/>
				</label>
				<button
					type="button"
					onClick={() => mutation.mutate()}
					disabled={mutation.isPending}
				>
					<Lock size={16} /> Sign in
				</button>
				{mutation.isError ? (
					<span className="error">Invalid credentials</span>
				) : null}
			</section>
		</main>
	);
}

type AuthenticatedSession = Session & { user: NonNullable<Session["user"]> };

function AdminConsole({ session }: { session: AuthenticatedSession }) {
	const qc = useQueryClient();
	const tasks = useQuery({
		queryKey: ["maintenanceTasks"],
		queryFn: fetchMaintenanceTasks,
	});
	const runs = useQuery({
		queryKey: ["maintenanceRuns"],
		queryFn: fetchMaintenanceRuns,
		refetchInterval: 2500,
	});
	const runTask = useMutation({
		mutationFn: (name: string) => runMaintenanceTaskMutation(name),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenanceRuns"] }),
	});

	return (
		<main className="admin">
			<header className="topbar">
				<div>
					<p>Go Fibe</p>
					<h1>Admin Console</h1>
				</div>
				<div className="identity">
					<span>{session.user.name}</span>
					<button
						type="button"
						className="secondary"
						onClick={async () => {
							await logout();
							await qc.invalidateQueries({ queryKey: ["session"] });
						}}
					>
						Sign out
					</button>
				</div>
			</header>

			<section className="grid">
				<section className="card hero">
					<Wrench size={28} />
					<h2>Maintenance</h2>
					<p>
						Run safe operational jobs or inspect dangerous jobs before using
						them.
					</p>
				</section>

				<section className="card">
					<h2>Available tasks</h2>
					<div className="list">
						{(tasks.data ?? []).map((task) => (
							<div className="row" key={task.name}>
								<div>
									<strong>{task.name}</strong>
									<span>{task.description}</span>
								</div>
								{task.dangerous ? (
									<b className="badge danger">dangerous</b>
								) : (
									<b className="badge">safe</b>
								)}
								<button
									type="button"
									onClick={() => runTask.mutate(task.name)}
									disabled={runTask.isPending}
								>
									<Play size={15} /> Run
								</button>
							</div>
						))}
					</div>
				</section>

				<section className="card">
					<h2>Recent runs</h2>
					<div className="list">
						{(runs.data ?? []).length === 0 ? (
							<p className="muted">No runs yet.</p>
						) : null}
						{(runs.data ?? []).map((run) => (
							<div className="row compact" key={run.id}>
								<div>
									<strong>{run.taskName}</strong>
									<span>{run.output ?? run.startedAt}</span>
								</div>
								<b className={`badge ${run.status}`}>{run.status}</b>
							</div>
						))}
					</div>
				</section>
			</section>
		</main>
	);
}

async function fetchSession() {
	const response = await fetch("/auth/session", { credentials: "include" });
	return response.json() as Promise<Session>;
}

async function fetchMaintenanceTasks() {
	const data = await graphql<{ maintenanceTasks: MaintenanceTask[] }>(
		`query { maintenanceTasks { name description dangerous } }`,
	);
	return data.maintenanceTasks;
}

type MaintenanceRun = {
	id: string;
	taskName: string;
	status: string;
	output?: string | null;
	startedAt: string;
};

async function fetchMaintenanceRuns() {
	const data = await graphql<{ maintenanceRuns: MaintenanceRun[] }>(
		`query { maintenanceRuns { id taskName status output startedAt } }`,
	);
	return data.maintenanceRuns;
}

async function runMaintenanceTaskMutation(name: string) {
	return graphql<{ runMaintenanceTask: { id: string } }>(
		`mutation Run($name: String!) { runMaintenanceTask(name: $name) { id } }`,
		{ name },
	);
}

const root = document.getElementById("root");
if (!root) throw new Error("Application root element is missing.");

createRoot(root).render(<App />);
