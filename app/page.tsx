'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { Plus, Trash2, Edit2, CheckCircle2, Circle, Calendar, Flag, Search, Mail, Zap, Settings, RefreshCw } from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  dueDate: string
  createdAt: string
  source?: 'manual' | 'email'
}

interface EmailTask {
  id: string
  subject: string
  sender: string
  priority: string
  suggestedTasks: string[]
}

const AGENTS = {
  GMAIL_ANALYZER: '691bd736499310d238fb0ad0',
  TASK_PROCESSOR: '691bd73f499310d238fb0ad1',
  ACTIVE_TASK_LIST: '691bd755731731d9a93a7df3',
  ORCHESTRATOR: '691bd77a66a08f7a74755b07'
}

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [emailTasks, setEmailTasks] = useState<EmailTask[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all')
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'medium', dueDate: '' })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('tasks')

  // Load tasks from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('tasks')
    if (saved) {
      setTasks(JSON.parse(saved))
    }
  }, [])

  // Save tasks to localStorage
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks))
  }, [tasks])

  const callAgent = async (agentId: string, message: string) => {
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          agent_id: agentId
        })
      })

      const data = await response.json()
      return data.response || data.raw_response
    } catch (error) {
      console.error('Agent call failed:', error)
      return null
    }
  }

  const handleSyncGmail = async () => {
    setLoading(true)
    try {
      const gmailAnalysis = await callAgent(
        AGENTS.GMAIL_ANALYZER,
        'Analyze my recent emails and extract actionable tasks'
      )

      if (gmailAnalysis) {
        const taskProcessor = await callAgent(
          AGENTS.TASK_PROCESSOR,
          `Process these email insights and create tasks: ${JSON.stringify(gmailAnalysis)}`
        )

        if (taskProcessor) {
          const parsedTasks = Array.isArray(taskProcessor)
            ? taskProcessor
            : typeof taskProcessor === 'string'
              ? parseTasksFromText(taskProcessor)
              : []

          const newEmailTasks = parsedTasks.map((t: any, idx: number) => ({
            id: `email-${Date.now()}-${idx}`,
            subject: t.subject || t.title || 'Task from Email',
            sender: t.sender || 'Unknown',
            priority: t.priority || 'medium',
            suggestedTasks: Array.isArray(t.tasks) ? t.tasks : [t.title || 'Task']
          }))

          setEmailTasks(newEmailTasks)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGetActiveTasks = async () => {
    setLoading(true)
    try {
      const response = await callAgent(
        AGENTS.ACTIVE_TASK_LIST,
        `Get my active tasks and organize by priority. Current tasks: ${JSON.stringify(tasks)}`
      )

      if (response) {
        console.log('Active tasks organized:', response)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOrchestrateWorkflow = async () => {
    setLoading(true)
    try {
      const response = await callAgent(
        AGENTS.ORCHESTRATOR,
        `Analyze my workflow and suggest optimizations. Current tasks: ${JSON.stringify(tasks)}`
      )

      if (response) {
        console.log('Workflow suggestions:', response)
      }
    } finally {
      setLoading(false)
    }
  }

  const parseTasksFromText = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim())
    return lines.map(line => ({
      title: line.replace(/^\d+\.\s*/, '').trim(),
      priority: 'medium'
    }))
  }

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    if (editingTask) {
      setTasks(tasks.map(t => t.id === editingTask.id ? { ...editingTask, ...formData } : t))
      setEditingTask(null)
    } else {
      const newTask: Task = {
        id: Date.now().toString(),
        ...formData,
        status: 'todo',
        createdAt: new Date().toISOString(),
        source: 'manual'
      }
      setTasks([...tasks, newTask])
    }

    setFormData({ title: '', description: '', priority: 'medium', dueDate: '' })
    setDialogOpen(false)
  }

  const handleAddEmailTask = (emailTask: EmailTask, taskTitle: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskTitle,
      description: `From: ${emailTask.sender} - ${emailTask.subject}`,
      priority: emailTask.priority as any,
      status: 'todo',
      dueDate: '',
      createdAt: new Date().toISOString(),
      source: 'email'
    }
    setTasks([...tasks, newTask])
    setEmailTasks(emailTasks.filter(et => et.id !== emailTask.id))
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setFormData({ title: task.title, description: task.description, priority: task.priority, dueDate: task.dueDate })
    setDialogOpen(true)
  }

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id))
  }

  const handleStatusChange = (id: string, status: Task['status']) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t))
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    return matchesSearch && matchesStatus && matchesPriority
  })

  const groupedTasks = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    'in-progress': filteredTasks.filter(t => t.status === 'in-progress'),
    done: filteredTasks.filter(t => t.status === 'done')
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    return status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Task Management</h1>
          <p className="text-gray-600">Manage tasks with intelligent automation powered by Lyzr AI agents</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingTask(null); setFormData({ title: '', description: '', priority: 'medium', dueDate: '' }) }} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                    <DialogDescription>Add or update your task details</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddTask} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Title *</label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="Task title"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Description</label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Task description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Priority</label>
                        <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v as any})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Due Date</label>
                        <Input
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      {editingTask ? 'Update Task' : 'Create Task'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {['todo', 'in-progress', 'done'].map((status) => (
                <div key={status} className="bg-white rounded-lg p-6 border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 capitalize">
                    {status === 'in-progress' ? 'In Progress' : status.replace('-', ' ')}
                  </h2>
                  <div className="space-y-3">
                    {groupedTasks[status as keyof typeof groupedTasks].length === 0 ? (
                      <p className="text-gray-400 text-sm">No tasks</p>
                    ) : (
                      groupedTasks[status as keyof typeof groupedTasks].map((task) => (
                        <Card key={task.id} className="cursor-pointer hover:shadow-md transition">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3 mb-3">
                              <button
                                onClick={() => handleStatusChange(task.id, task.status === 'done' ? 'todo' : 'done')}
                                className="mt-1 text-gray-400 hover:text-gray-600"
                              >
                                {getStatusIcon(task.status)}
                              </button>
                              <div className="flex-1">
                                <p className={`font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <Badge className={getPriorityColor(task.priority)}>
                                <Flag className="w-3 h-3 mr-1" />
                                {task.priority}
                              </Badge>
                              {task.source === 'email' && (
                                <Badge variant="secondary" className="text-xs">
                                  <Mail className="w-3 h-3 mr-1" />
                                  Email
                                </Badge>
                              )}
                              {task.dueDate && (
                                <Badge variant="outline" className="text-xs">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </Badge>
                              )}
                            </div>

                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleEditTask(task)}
                                className="p-1 text-gray-400 hover:text-blue-600"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="p-1 text-gray-400 hover:text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Task</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this task? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <div className="flex gap-3 justify-end">
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteTask(task.id)} className="bg-red-600 hover:bg-red-700">
                                      Delete
                                    </AlertDialogAction>
                                  </div>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">To Do</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">{groupedTasks.todo.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-yellow-600">{groupedTasks['in-progress'].length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Done</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{groupedTasks.done.length}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-6">
            <div className="flex gap-4">
              <Button onClick={handleSyncGmail} disabled={loading} className="gap-2">
                {loading ? <Spinner className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                Sync Gmail
              </Button>
              <p className="text-sm text-gray-600 flex items-center">
                {emailTasks.length} tasks extracted from emails
              </p>
            </div>

            <div className="space-y-4">
              {emailTasks.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No email tasks. Click "Sync Gmail" to extract actionable tasks from your emails.</p>
                  </CardContent>
                </Card>
              ) : (
                emailTasks.map((emailTask) => (
                  <Card key={emailTask.id}>
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="font-semibold text-gray-900">{emailTask.subject}</h3>
                        <p className="text-sm text-gray-600">From: {emailTask.sender}</p>
                      </div>
                      <div className="space-y-2">
                        {emailTask.suggestedTasks.map((taskTitle, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-900">{taskTitle}</p>
                            <Button
                              onClick={() => handleAddEmailTask(emailTask, taskTitle)}
                              size="sm"
                              variant="outline"
                            >
                              Add Task
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Gmail Analyzer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Analyzes your Gmail inbox to extract actionable tasks and priorities.
                  </p>
                  <Button onClick={handleSyncGmail} disabled={loading} className="w-full">
                    {loading ? <Spinner className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                    {loading ? 'Analyzing...' : 'Analyze Inbox'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Task Processor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Processes tasks from various sources and prioritizes them intelligently.
                  </p>
                  <Button disabled={tasks.length === 0} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Process Tasks
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Active Task List
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Manages and organizes your active tasks by priority and status.
                  </p>
                  <Button onClick={handleGetActiveTasks} disabled={loading || tasks.length === 0} className="w-full">
                    {loading ? <Spinner className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                    {loading ? 'Organizing...' : 'Organize Tasks'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Orchestrator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Optimizes your workflow and suggests improvements based on all agents.
                  </p>
                  <Button onClick={handleOrchestrateWorkflow} disabled={loading || tasks.length === 0} className="w-full">
                    {loading ? <Spinner className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    {loading ? 'Analyzing...' : 'Optimize Workflow'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
