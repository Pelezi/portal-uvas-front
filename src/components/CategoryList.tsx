'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '@/services/categoryService';
import { subcategoryService } from '@/services/subcategoryService';
import { Category, Subcategory, EntityType } from '@/types';
import { Plus, Edit2, Trash2, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface CategoryListProps {
  groupId?: number;
  canManage?: boolean;
  canView?: boolean;
}

export default function CategoryList({ 
  groupId, 
  canManage = true, 
  canView = true 
}: CategoryListProps) {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<EntityType>('EXPENSE');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [editingCategoryId, setEditingCategoryId] = useState<number | 'new' | null>(null);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<number | 'new' | null>(null);
  const [editingSubcategoryCategory, setEditingSubcategoryCategory] = useState<number | null>(null);
  const [categoryInputValue, setCategoryInputValue] = useState('');
  const [subcategoryInputValue, setSubcategoryInputValue] = useState('');
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const subcategoryInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useQuery({
    queryKey: groupId ? ['categories', groupId] : ['categories'],
    queryFn: () => categoryService.getAll(groupId),
    enabled: canView,
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: groupId ? ['subcategories', groupId] : ['subcategories'],
    queryFn: () => subcategoryService.getAll(groupId),
    enabled: canView,
  });

  const createCategoryMutation = useMutation({
    mutationFn: categoryService.create,
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria salva com sucesso!');
      setEditingCategoryId(null);
      setCategoryInputValue('');

      const created = response?.data ?? response;
      const createdId = created?.id;

      if (createdId) {
        setExpandedCategories((prev) => {
          const newSet = new Set(prev);
          newSet.add(createdId);
          return newSet;
        });

        setEditingSubcategoryId('new');
        setEditingSubcategoryCategory(createdId);
        setSubcategoryInputValue('');

        setTimeout(() => {
          const el = document.getElementById(`category-${createdId}`);
          if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          }

          setTimeout(() => {
            subcategoryInputRef.current?.focus();
            subcategoryInputRef.current?.select();
          }, 120);
        }, 60);
      }
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Category> }) =>
      categoryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria salva com sucesso!');
      setEditingCategoryId(null);
      setCategoryInputValue('');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: categoryService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      toast.success('Categoria excluída');
    },
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: subcategoryService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      toast.success('Subcategoria salva com sucesso!');
      setSubcategoryInputValue('');
      setTimeout(() => {
        subcategoryInputRef.current?.focus();
      }, 50);
    },
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Subcategory> }) =>
      subcategoryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      toast.success('Subcategoria salva com sucesso!');
      setEditingSubcategoryId(null);
      setEditingSubcategoryCategory(null);
      setSubcategoryInputValue('');
    },
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: subcategoryService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      toast.success('Subcategoria excluída');
    },
  });

  useEffect(() => {
    if (editingCategoryId) {
      categoryInputRef.current?.focus();
      categoryInputRef.current?.select();
    }
  }, [editingCategoryId]);

  useEffect(() => {
    if (editingSubcategoryId) {
      subcategoryInputRef.current?.focus();
      subcategoryInputRef.current?.select();
    }
  }, [editingSubcategoryId]);

  const handleAddCategory = () => {
    if (!canManage) return;
    setEditingCategoryId('new');
    setCategoryInputValue('');
  };

  const handleEditCategory = (category: Category) => {
    if (!canManage) return;
    setEditingCategoryId(category.id);
    setCategoryInputValue(category.name);
  };

  const handleSaveCategory = () => {
    const trimmedName = categoryInputValue.trim();
    if (!trimmedName) {
      setEditingCategoryId(null);
      setCategoryInputValue('');
      return;
    }

    if (editingCategoryId === 'new') {
      createCategoryMutation.mutate({ 
        name: trimmedName, 
        type: activeTab,
        ...(groupId && { groupId })
      });
    } else if (typeof editingCategoryId === 'number') {
      updateCategoryMutation.mutate({ id: editingCategoryId, data: { name: trimmedName } });
    }
  };

  const handleCancelCategory = () => {
    setEditingCategoryId(null);
    setCategoryInputValue('');
  };

  const handleDeleteCategory = (id: number) => {
    if (!canManage) return;
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const handleAddSubcategory = (categoryId: number) => {
    if (!canManage) return;
    setEditingSubcategoryId('new');
    setEditingSubcategoryCategory(categoryId);
    setSubcategoryInputValue('');
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      newSet.add(categoryId);
      return newSet;
    });
  };

  const handleEditSubcategory = (subcategory: Subcategory) => {
    if (!canManage) return;
    setEditingSubcategoryId(subcategory.id);
    setEditingSubcategoryCategory(subcategory.categoryId);
    setSubcategoryInputValue(subcategory.name);
  };
  const handleSaveSubcategory = () => {
    const trimmedName = subcategoryInputValue.trim();
    if (!trimmedName || !editingSubcategoryCategory) {
      setEditingSubcategoryId(null);
      setEditingSubcategoryCategory(null);
      setSubcategoryInputValue('');
      return;
    }

    if (editingSubcategoryId === 'new') {
      createSubcategoryMutation.mutate({
        name: trimmedName,
        categoryId: editingSubcategoryCategory,
        type: activeTab,
        ...(groupId && { groupId })
      });
    } else if (typeof editingSubcategoryId === 'number') {
      updateSubcategoryMutation.mutate({ id: editingSubcategoryId, data: { name: trimmedName } });
    }
  };

  const handleCancelSubcategory = () => {
    setEditingSubcategoryId(null);
    setEditingSubcategoryCategory(null);
    setSubcategoryInputValue('');
  };

  const handleDeleteSubcategory = (id: number) => {
    if (!canManage) return;
    if (confirm('Tem certeza que deseja excluir esta subcategoria?')) {
      deleteSubcategoryMutation.mutate(id);
    }
  };

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveCategory();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelCategory();
    }
  };

  const handleSubcategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveSubcategory();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelSubcategory();
    }
  };

  const filteredCategories = categories
    .filter((cat) => cat.type === activeTab)
    .sort((a, b) => a.name.localeCompare(b.name));
    
  const getCategorySubcategories = (categoryId: number) =>
    subcategories
      .filter((sub) => sub.categoryId === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            setActiveTab('EXPENSE');
            setExpandedCategories(new Set());
            handleCancelCategory();
            handleCancelSubcategory();
          }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'EXPENSE'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Despesa
        </button>
        <button
          onClick={() => {
            setActiveTab('INCOME');
            setExpandedCategories(new Set());
            handleCancelCategory();
            handleCancelSubcategory();
          }}
          className={`px-4 py-2 font-medium ${
            activeTab === 'INCOME'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Renda
        </button>
      </div>

      {/* Categories Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Categorias</h2>
          {/* Floating button replaced inline header button (see floating FAB at bottom) */}
        </div>
        <div className="p-4 space-y-2">
          {/* New Category Input */}
          {editingCategoryId === 'new' && (
            <div className="border-2 border-blue-500 dark:border-blue-400 rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20 animate-fade-in">
              <div className="flex items-center gap-2">
                <input
                  ref={categoryInputRef}
                  type="text"
                  value={categoryInputValue}
                  onChange={(e) => setCategoryInputValue(e.target.value)}
                  onKeyDown={handleCategoryKeyDown}
                  placeholder="Nome da Categoria"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={handleCancelCategory}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  title="Cancel (Esc)"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Pressione Enter para salvar, Escape para cancelar</p>
            </div>
          )}

          {filteredCategories.length === 0 && editingCategoryId !== 'new' ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Nenhuma categoria encontrada. {canManage && 'Clique em "Adicionar Categoria" para criar uma.'}
            </p>
          ) : (
            filteredCategories.map((category) => {
              const categorySubcategories = getCategorySubcategories(category.id);
              const isExpanded = expandedCategories.has(category.id);
              const isEditingThisCategory = editingCategoryId === category.id;

              return (
                <div
                  key={category.id}
                  id={`category-${category.id}`}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Category Header */}
                  <div 
                    className="p-3 bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => !isEditingThisCategory && toggleCategory(category.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="text-gray-600 dark:text-gray-400 transition-transform duration-200"
                          style={{
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          }}
                        >
                          <ChevronRight size={20} />
                        </div>
                        {isEditingThisCategory ? (
                          <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              ref={categoryInputRef}
                              type="text"
                              value={categoryInputValue}
                              onChange={(e) => setCategoryInputValue(e.target.value)}
                              onKeyDown={handleCategoryKeyDown}
                              className="flex-1 px-2 py-1 border border-blue-500 dark:border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                            <button
                              onClick={handleCancelCategory}
                              className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                              title="Cancel (Esc)"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {category.name}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              ({categorySubcategories.length})
                            </span>
                          </>
                        )}
                      </div>
                      {!isEditingThisCategory && canManage && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleAddSubcategory(category.id)}
                            className="flex items-center gap-1 px-2 py-1 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                            title="Add subcategory"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded transition-colors"
                            title="Edit category"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded transition-colors"
                            title="Delete category"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subcategories List (Expanded) */}
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: isExpanded ? '2000px' : '0',
                      opacity: isExpanded ? 1 : 0,
                    }}
                  >
                    <div className="bg-white dark:bg-gray-800">
                      {/* New Subcategory Input */}
                      {editingSubcategoryId === 'new' && editingSubcategoryCategory === category.id && (
                        <div className="p-3 pl-12 border-b-2 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20">
                          <div className="flex items-center gap-2">
                            <input
                              ref={subcategoryInputRef}
                              type="text"
                              value={subcategoryInputValue}
                              onChange={(e) => setSubcategoryInputValue(e.target.value)}
                              onKeyDown={handleSubcategoryKeyDown}
                              placeholder="Nome da Subcategoria"
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                            <button
                              onClick={handleCancelSubcategory}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                              title="Cancel (Esc)"
                            >
                              <X size={20} />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Pressione Enter para salvar, Escape para cancelar</p>
                        </div>
                      )}

                      {categorySubcategories.length === 0 && editingSubcategoryCategory !== category.id ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                          Nenhuma subcategoria
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {categorySubcategories.map((subcategory, index) => {
                            const isEditingThisSubcategory = editingSubcategoryId === subcategory.id;
                            return (
                              <div
                                key={subcategory.id}
                                className="p-3 pl-12 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                style={{
                                  animation: isExpanded
                                    ? `slideIn 0.3s ease-out ${index * 50}ms backwards`
                                    : 'none',
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  {isEditingThisSubcategory ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <input
                                        ref={subcategoryInputRef}
                                        type="text"
                                        value={subcategoryInputValue}
                                        onChange={(e) => setSubcategoryInputValue(e.target.value)}
                                        onKeyDown={handleSubcategoryKeyDown}
                                        className="flex-1 px-2 py-1 border border-blue-500 dark:border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                      />
                                      <button
                                        onClick={handleCancelSubcategory}
                                        className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                        title="Cancel (Esc)"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-gray-900 dark:text-gray-100">
                                        {subcategory.name}
                                      </span>
                                      {canManage && (
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleEditSubcategory(subcategory)}
                                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded"
                                            title="Edit subcategory"
                                          >
                                            <Edit2 size={16} />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSubcategory(subcategory.id)}
                                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded"
                                            title="Delete subcategory"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {/* Floating Add Category Button (matches other FABs in the app) */}
      {canManage && (
        <button
          onClick={handleAddCategory}
          disabled={editingCategoryId === 'new'}
          className="fixed bottom-6 right-6 z-40 p-4 bg-blue-600 dark:bg-blue-700 text-white rounded-full shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Adicionar categoria"
        >
          <Plus size={24} />
        </button>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
